# Nota para Raspberry Pi: Si en algún momento te da un error de "ALSA" o "libsdl", ejecuta esto en la terminal de la Pi para asegurar las dependencias de bajo nivel:
# sudo apt-get install libsdl2-mixer-2.0-0 libsdl2-dev
from core.event_bus import EventBus
from modules.sound.audio_manager import AudioManager

class SoundEngine:
    # Listens for system events and plays the corresponding
    # sound effects to provide audio feedback to the user.
    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._queue = self._event_bus.subscribe("sound_engine")
        # Manages loading, caching and playback of application sound effects.
        self._audio_manager = AudioManager()
        
    async def run(self):
        while True:
            message = await self._queue.get()
            if message["name"] == "WAKE_DETECTED":
                self._audio_manager.play("start_conversation.wav")
            if message["name"] == "IDLE":
                self._audio_manager.play("end_conversation.wav")  
