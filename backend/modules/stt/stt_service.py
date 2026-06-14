import asyncio
import numpy as np
from core.event_bus import EventBus
from faster_whisper import WhisperModel
from modules.stt.audio_recorder import AudioRecorder


class SttService:
    def __init__(self, event_bus: EventBus, audio_recorder: AudioRecorder):
        self._event_bus = event_bus
        self._queue = event_bus.subscribe("stt_service")
        self._audio_recorder = audio_recorder
        # 'base' model for PC — switch to 'tiny' on Raspberry Pi if performance drops.
        # compute_type="int8" forces integer quantization: optimal for CPU (ARM/x86) registers,
        # halving RAM (~150MB) and doubling speed, whereas int16 / float16 would degrade CPU performance
        self._model = WhisperModel("base", device="cpu", compute_type="int8")

    # Main service loop — listens for WAKE_DETECTED events.
    # Records audio via AudioRecorder, transcribes it and publishes STT_DONE with the text.
    # If no voice is detected within the timeout, returns to IDLE.
    async def run(self):
        while True:
            message = await self._queue.get()

            if message["name"] in ["WAKE_DETECTED", "KEEP_LISTENING"]:
                await self._event_bus.publish("LISTENING", {})
                #await asyncio.sleep(0.1)  # wait for wake word audio to fade
                audio = await self._audio_recorder.record()

                if audio is None:
                    # Timeout — no voice detected, return to idle
                    await self._event_bus.publish("IDLE", {})
                    continue

                await self._event_bus.publish("PROCESSING_STT", {})
                print(f"[SttService] Audio length: {len(audio)} samples ({len(audio)/16000:.1f}s)")
                
                text = self._transcribe(audio)
                
                if text is None:
                    # Transcription failed due to an error
                    print("[SttService] Transcription error")
                    await self._event_bus.publish("IDLE", {})
                elif not text.strip():
                    # Transcription succeeded but returned empty — silence or inaudible audio
                    print("[SttService] Empty transcription")
                    await self._event_bus.publish("IDLE", {})
                else:
                    print(f"[SttService] Transcribed: '{text}'")
                    await self._event_bus.publish("STT_DONE", {"user_input": text})

    # Transcribes a numpy audio array to text using faster-whisper.
    # Remove 'language' to enable auto-detection (not recommended)
    def _transcribe(self, audio: np.ndarray) -> str | None:
        try: 
            # faster-whisper requires float32 normalized between -1.0 and 1.0
            audio_float = self._ensure_float32(audio)
            # STT Optimization: beam_size=5 evaluates 5 word paths in parallel for contextual self-correction
            # without spiking CPU latency. vad_filter=True + min_speech_duration_ms=250 strips out ambient 
            # silence, static, and short accidental noises (clicks, breaths < 0.25s) to prevent hallucinations.
            segments, _ = self._model.transcribe(audio_float, beam_size=5, language="es", vad_filter=True, vad_parameters=dict(min_speech_duration_ms=250))
            return " ".join([segment.text for segment in segments]).strip()
        except Exception as e:
            print(f"[SttService] Transcription error: {e}")
            return None
    
    @staticmethod
    def _ensure_float32(audio: np.ndarray) -> np.ndarray:
        # AudioRecorder records audio as int16. This helper converts the
        # samples to float32 to provide a consistent format for all audio
        # processing components.
        if audio.dtype == np.float32:
            return audio
        return audio.astype(np.float32) / 32768.0