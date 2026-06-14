import io
import edge_tts
import numpy as np
import soundfile as sf
from modules.tts.providers.base import BaseVoiceProvider

# Audio output constants — must match TtsService stream configuration
SAMPLE_RATE = 16000  # Hz — standard for voice audio
CHANNELS = 1         # mono — sufficient for voice, reduces memory usage
DTYPE = np.int16     # 16-bit signed PCM — standard format for sounddevice

# Edge TTS provider implementation.
# Streams MP3 audio from Microsoft Edge servers, decodes to PCM and yields it.
# No API key required — uses Microsoft Edge TTS servers directly.
# Free and unlimited, but requires internet connection.
class EdgeTTSProvider(BaseVoiceProvider):
    def __init__(self, voice_id: str):
        self._voice_id = voice_id

    # Generates PCM audio from text using Edge TTS.
    # Collects all MP3 chunks, decodes to PCM and normalizes format for sounddevice.
    # Yields a single numpy int16 array ready for playback.
    async def generate_voice(self, text: str):
        try:
            communicate = edge_tts.Communicate(text=text, voice=self._voice_id)
            mp3_buffer = b""

            # Accumulate all MP3 chunks before decoding
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    mp3_buffer += chunk["data"]

            # Decode MP3 to PCM using soundfile
            audio, sample_rate = sf.read(io.BytesIO(mp3_buffer), dtype="int16")

            # Resample if Edge TTS returns a different sample rate than expected
            if sample_rate != SAMPLE_RATE:
                import resampy
                audio = resampy.resample(audio.astype(np.float32), sample_rate, SAMPLE_RATE).astype(DTYPE)

            # Convert stereo to mono if needed — sounddevice expects mono for CHANNELS=1
            if audio.ndim > 1:
                audio = audio.mean(axis=1).astype(DTYPE)

            yield audio

        except Exception as e:
            raise RuntimeError(f"[EdgeTTSProvider Error] {e}")