import json
import asyncio
import ws_server
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
        self._provider_names = [p.get_name() for p in self._providers]
        self._provider_cooldowns = {}
        self._current_task = None 
        
    # Main service loop — listens for AI_DONE events and triggers audio playback.
    async def run(self):
        await self._ws_send("TTS_PROVIDER_NAMES", self._provider_names)
        while True:
            message = await self._queue.get()
            
            if message["name"] == "AI_DONE":
                text = message["data"]["response"]
                print(f"[TtsService] Response: {text}")
                
                self._current_task = asyncio.create_task(self._handle_playback(text))
            
            elif message["name"] == "STOP_SPEAKING":
                # 3. Cancelamos la tarea asíncrona si sigue corriendo
                if self._current_task and not self._current_task.done():
                    self._current_task.cancel()
                
                sd.stop()
                


    async def _handle_playback(self, text: str):
        try:
            await self._event_bus.publish("SPEAKING", {})
            await self._play_stream(text)
            await self._event_bus.publish("SPEAKING_DONE", {})
        except asyncio.CancelledError:
            print("[TtsService] Reproducción de audio cancelada por nuevo input.")
            await self._event_bus.publish("IDLE", {})
            raise

    async def _play_stream(self, text: str):
        # Tries each provider in order, skipping those in cooldown.
        # If a provider fails, it enters a 5 minute cooldown before being retried.
        for provider in self._providers:
            if datetime.now() < self._provider_cooldowns.get(provider, datetime.min):
                continue
            try:
                await self._play_with_provider(provider, text)
                return
            except RuntimeError as e:
                self._provider_cooldowns[provider] = datetime.now() + timedelta(minutes=5)
                print(f"[TtsService] Provider failed, cooldown 5min: {e}")
                continue
        await self._ws_send("ALL_TTS_PROVIDERS_DOWN", "")
        print("[TtsService] All providers failed — skipping audio")

    async def _play_with_provider(self, provider, text: str):
        async for audio in provider.generate_voice(text):
            await self._ws_send("ACTIVE_TTS_PROVIDER", provider.get_name())
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                lambda a=audio: (sd.play(a, samplerate=SAMPLE_RATE), sd.wait())
            )

    async def _ws_send(self, name: str, data: str | list):
        if ws_server.connected_socket:
            try:
                await ws_server.connected_socket.send_text(json.dumps({"name": name, "data": data}))
            except Exception:
                pass
            
        