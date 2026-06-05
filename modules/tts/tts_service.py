import asyncio
import numpy as np
import sounddevice as sd
from modules.tts.provider_factory import create_tts_provider
from core.event_bus import EventBus

SAMPLE_RATE = 16000
CHANNELS = 1
DTYPE = np.int16

class TtsService:
    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._queue = event_bus.subscribe("tts_service")
        self._provider = create_tts_provider()

    # Listens for IA_DONE events and reproduces the response as audio.
    async def run(self):
        while True:
            message = await self._queue.get()

            if message["name"] == "IA_DONE":
                text = message["data"]["response"]
                await self._event_bus.publish("SPEAKING", {})
                await self._play_stream(text)
                await self._event_bus.publish("SPEAKING_DONE", {})

    # Opens an audio stream and writes chunks as they arrive from the provider.
    # OutputStream stays open during the full response — closes automatically when done.
    async def _play_stream(self, text: str):
        with sd.OutputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype=DTYPE) as stream:
            stream.write(np.zeros(int(SAMPLE_RATE * 0.50) , dtype=DTYPE))  # 500ms silence buffer
            async for chunk in self._provider.generate_voice(text):
                stream.write(chunk)