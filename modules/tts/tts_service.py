import queue
import asyncio
import threading
import numpy as np
import sounddevice as sd
from core.event_bus import EventBus
from datetime import datetime, timedelta
from modules.tts.provider_factory import create_tts_providers

# Audio output parameters — must match provider output format
SAMPLE_RATE = 16000  # Hz — standard for voice audio
CHANNELS = 1         # mono — sufficient for voice, reduces memory usage
DTYPE = np.int16     # 16-bit signed PCM — standard format for sounddevice

# Central TTS module. Listens for AI_DONE events and plays the response as audio.
# Tries providers in order — if one fails, it enters cooldown and the next is tried.
class TtsService:
    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._queue = event_bus.subscribe("tts_service")
        self._providers = create_tts_providers()
        # Tracks when each provider is available again after a failure
        self._provider_cooldowns = {}
        # Thread-safe queue to pass audio chunks from async loop to the playback thread
        self._audio_queue = queue.Queue()
        # Dedicated thread for blocking audio playback to keep the event loop responsive
        self._audio_thread = threading.Thread(target=self._audio_worker, daemon=True)
        self._audio_thread.start()

    # Background worker that handles synchronous sounddevice operations.
    # Opens the hardware stream dynamically only when an active voice response starts,
    # and closes it immediately when the transmission finishes to release OS audio resources.
    def _audio_worker(self):
        while True:
            # Blocks this background thread until the FIRST chunk of a new utterance arrives
            first_chunk = self._audio_queue.get()
            
            # Skip explicit stop signals or safety None tokens received outside of a playback context
            if first_chunk is None:
                self._audio_queue.task_done()
                continue
            
            # Open the audio hardware stream ONLY for the duration of this specific response
            with sd.OutputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype=DTYPE) as stream:
                stream.write(first_chunk)
                self._audio_queue.task_done()
                
                # Internal inner loop to consume the remaining continuous chunks of the current stream
                while True:
                    chunk = self._audio_queue.get()
                    
                    if chunk is None:
                        # End-of-stream token reached — break inner loop to exit context manager and close the hardware
                        self._audio_queue.task_done()
                        break
                    
                    # Write continuous blocks into the active sound hardware
                    stream.write(chunk)
                    self._audio_queue.task_done()

    # Main service loop — listens for AI_DONE events and triggers audio playback.
    async def run(self):
        while True:
            message = await self._queue.get()
            if message["name"] == "AI_DONE":
                text = message["data"]["response"]
                print(f"[TtsService] Response: {text}")
                await self._event_bus.publish("SPEAKING", {})
                await self._play_stream(text)
                await self._event_bus.publish("SPEAKING_DONE", {})

    # Tries each provider in order, skipping those in cooldown.
    # If a provider fails, it enters a 5 minute cooldown before being retried.
    async def _play_stream(self, text: str):
        for provider in self._providers:
            if datetime.now() < self._provider_cooldowns.get(provider, datetime.min):
                continue
            try:
                await self._play_with_provider(provider, text)
                return
            except RuntimeError as e:
                # Any failure — cooldown 5 minutes before retrying
                self._provider_cooldowns[provider] = datetime.now() + timedelta(minutes=5)
                print(f"[TtsService] Provider failed, cooldown 5min: {e}")
                continue
        print("[TtsService] All providers failed — skipping audio")

    # Streams chunks as they arrive from the provider and offloads them to the playback thread.
    # Yields control back to the event loop on every step to prevent blocking.
    async def _play_with_provider(self, provider, text: str):
        # Clear any leftover data or unhandled tokens in the queue before starting a new stream
        while not self._audio_queue.empty():
            try:
                self._audio_queue.get_nowait()
                self._audio_queue.task_done()
            except queue.Empty:
                break

        # Push a small silence padding chunk to prevent hardware clipping pops
        self._audio_queue.put(np.zeros(int(SAMPLE_RATE * 0.3), dtype=DTYPE))
        
        # Non-blocking collection of incoming generator audio chunks
        async for chunk in provider.generate_voice(text):
            self._audio_queue.put(chunk)
            # Yield control explicitly allowing other async background tasks to execute
            await asyncio.sleep(0)
            
        # Send a placeholder token indicating generation is over, signaling the worker to close the stream
        self._audio_queue.put(None)
        
        # Block the execution flow here until the background worker finishes flushing the queue
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._audio_queue.join)