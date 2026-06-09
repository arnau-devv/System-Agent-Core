import queue
import asyncio
import numpy as np
import sounddevice as sd
from core.event_bus import EventBus
from datetime import datetime, timedelta
from modules.stt.audio_recorder import AudioRecorder
from modules.wake_word.provider_factory import create_wake_word_providers


# --- Audio parameters ---
SAMPLE_RATE = 16000       # Hz — required by faster-whisper
CHANNELS = 1              # mono
DTYPE = np.int16          # standard PCM format
CHUNK_DURATION = 0.08     # seconds per chunk (100 ms)
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION)

# --- Detection parameters ---
SILENCE_DURATION = 1.0    # Seconds of silence before considering the utterance finished
VOICE_TIMEOUT = 4.0       # Maximum time to wait for speech before cancelling


class WakeWordService:
    def __init__(self, event_bus: EventBus, audio_recorder: AudioRecorder):
        self._providers = create_wake_word_providers()
        self._audio_recorder = audio_recorder
        self._event_bus = event_bus
        self._wake_word = False
        self._queue = event_bus.subscribe("wake_word_service")
        self._provider_cooldowns = {}
        
        
    async def run(self):
        while True:
            message = await self._queue.get()
            if message["name"] == "IDLE":
                self._wake_word = False
                await asyncio.sleep(0.5)
                
                for provider in self._providers:
                    provider.reset()
                
                print("[WakeWordService] System idle, starting microphone listener...")
                await self._listen()
                if self._wake_word:
                    await self._event_bus.publish("WAKE_DETECTED", {})

    async def _listen(self):
        q = queue.Queue()
        
        def callback(indata: np.ndarray, frames, time, status):
            # Called by sounddevice on a separate thread for each chunk
            # frames, time and status are required by sounddevice but not used here
            q.put(indata.copy())
        
        with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS,
                            dtype=DTYPE, blocksize=CHUNK_SIZE,
                            callback=callback):
            while True:
                await asyncio.sleep(CHUNK_DURATION)
                try:
                    chunk = q.get_nowait()
                except queue.Empty:
                    continue
                
                await self._process_chunk(chunk)
                
                # If a provider successfully detected the wake word, exit listener loop
                if self._wake_word:
                    return
                
    async def _process_chunk(self, chunk: np.ndarray):
        # Tries each provider in order until one succeeds
        for provider in self._providers: 
            if datetime.now() < self._provider_cooldowns.get(provider, datetime.min):
                continue
            try:    
                # Explicitly await the async provider detection
                wake_word = await provider.detect_wake_word(chunk)
                if wake_word:
                    self._wake_word = True
                    return # Stop checking other providers if one already matched
            except RuntimeError as e:
                # Any failure — cooldown 5 minutes before retrying
                self._provider_cooldowns[provider] = datetime.now() + timedelta(minutes=5)
                print(f"[WakeWordService] Provider failed, cooldown 5min: {e}")
        # print("[WakeWordService] All providers failed")
        
        