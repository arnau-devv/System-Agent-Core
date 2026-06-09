import asyncio
from datetime import datetime, timedelta
import numpy as np
import sounddevice as sd
from modules.tts.provider_factory import create_tts_providers
from core.event_bus import EventBus

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

    # Opens an audio output stream and writes chunks as they arrive from the provider.
    # OutputStream closes automatically when the with block exits.
    async def _play_with_provider(self, provider, text: str):
        with sd.OutputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype=DTYPE) as stream:
            stream.write(np.zeros(int(SAMPLE_RATE * 0.3), dtype=DTYPE))
            async for chunk in provider.generate_voice(text):
                stream.write(chunk)