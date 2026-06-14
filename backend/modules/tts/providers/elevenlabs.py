import numpy as np
from elevenlabs.client import AsyncElevenLabs
from modules.tts.providers.base import BaseVoiceProvider

# Audio constants — must match the output_format requested to ElevenLabs
SAMPLE_RATE = 16000  # Hz  (pcm_16000)
DTYPE = np.int16     # 16-bit signed PCM
BYTES_PER_SAMPLE = 2  # int16 = 2 bytes

class ElevenLabsProvider(BaseVoiceProvider):
    def __init__(self, api_key: str, model: str, voice_id: str):
        self._client = AsyncElevenLabs(api_key=api_key)
        self._model = model
        self._voice_id = voice_id

    # Yields PCM audio chunks as they arrive from ElevenLabs.
    # Does NOT reproduce — that's TtsService's responsibility.
    async def generate_voice(self, text: str):
        try:
            audio_stream = self._client.text_to_speech.convert(
                text=text,
                voice_id=self._voice_id,
                model_id=self._model,
                output_format="pcm_16000",
            )

            remainder = b""  # leftover bytes if chunk is odd-sized

            async for chunk in audio_stream:
                if not chunk:
                    continue

                chunk = remainder + chunk
                trim = len(chunk) - (len(chunk) % BYTES_PER_SAMPLE)
                remainder = chunk[trim:]
                chunk = chunk[:trim]

                if chunk:
                    yield np.frombuffer(chunk, dtype=DTYPE)

        except Exception as e:
            raise RuntimeError(f"[ElevenLabsProvider Error] {e}")