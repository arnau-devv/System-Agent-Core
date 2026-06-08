import numpy as np
from faster_whisper import WhisperModel
from modules.stt.audio_recorder import AudioRecorder
from core.event_bus import EventBus


class SttService:
    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._queue = event_bus.subscribe("stt_service")
        self._audio_recorder = AudioRecorder()
        # 'base' model for PC development — switch to 'tiny' on Raspberry Pi if needed
        self._model = WhisperModel("base", device="cpu")

    # Main service loop — listens for WAKE_DETECTED events.
    # Records audio via AudioRecorder, transcribes it and publishes STT_DONE with the text.
    # If no voice is detected within the timeout, returns to IDLE.
    async def run(self):
        while True:
            message = await self._queue.get()

            if message["name"] == "WAKE_DETECTED":
                await self._event_bus.publish("LISTENING", {})
                audio = await self._audio_recorder.record()

                if audio is None:
                    # Timeout — no voice detected, return to idle
                    await self._event_bus.publish("IDLE", {})
                    continue

                await self._event_bus.publish("PROCESSING_STT", {})
                print(f"[SttService] Audio length: {len(audio)} samples ({len(audio)/16000:.1f}s)")
                text = self._transcribe(audio)
                print(f"[SttService] Transcribed: '{text}'")
                await self._event_bus.publish("STT_DONE", {"user_input": text})

    # Transcribes a numpy audio array to text using faster-whisper.
    # Language is auto-detected — no forced Spanish, the system accepts any language.
    def _transcribe(self, audio: np.ndarray) -> str:
        # faster-whisper requires float32 normalized between -1.0 and 1.0
        audio_float = audio.astype(np.float32) / 32768.0
        segments, _ = self._model.transcribe(audio_float, beam_size=5, language="es")
        return " ".join([segment.text for segment in segments])