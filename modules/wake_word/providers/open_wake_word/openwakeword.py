import asyncio
import numpy as np
from openwakeword.model import Model
from modules.wake_word.providers.base import BaseWakeWordProvider


class OpenWakeWordProvider(BaseWakeWordProvider):
    # Detection confidence threshold (0.0 to 1.0).
    # The model outputs a score per chunk — if it exceeds this value, the wake word is considered detected.
    # Higher values = fewer false positives but may miss real activations.
    # Lower values = more sensitive but may trigger on similar-sounding words.
    DETECTION_THRESHOLD = 0.3

    def __init__(self, model_instance: Model, wake_word: str):
        self._model = model_instance
        # Wake word key used to look up the score in the model's prediction dictionary.
        # The model may return keys like "hey_jarvis" or "hey_jarvis_v0.1" — we match loosely.
        self._wake_word = wake_word
        # Counter used to print diagnostic telemetry every N chunks without blocking detection.
        self._chunk_count = 0

    def reset(self):
        # Clears the model's internal rolling context window.
        # OpenWakeWord accumulates audio history to improve detection accuracy.
        # Without resetting, residual audio from a previous session can cause
        # a false positive on the very first chunks of a new listening session.
        self._model.reset()
        self._chunk_count = 0

    async def detect_wake_word(self, chunk: np.ndarray) -> bool:
        score = await self._get_score(chunk)
        if score >= OpenWakeWordProvider.DETECTION_THRESHOLD:
            print(f"[OpenWakeWordProvider] Wake word detected (score: {score:.4f})")
            return True
        return False

    async def _get_score(self, chunk: np.ndarray) -> float:
        flat_chunk = chunk.flatten()

        # model.predict() is a synchronous CPU-bound call.
        # Running it with asyncio.to_thread() moves it to a background thread,
        # so it doesn't block the async event loop while the model processes audio.
        predictions = await asyncio.to_thread(self._model.predict, flat_chunk)

        self._chunk_count += 1
        if self._chunk_count % 25 == 0:
            # Print diagnostic info every ~2 seconds (25 chunks × 0.08s = 2s).
            # Useful during calibration to check microphone volume and model scores.
            peak_volume = np.max(np.abs(flat_chunk))
            print(f"[OpenWakeWordProvider] Volume: {peak_volume} | Scores: {dict(predictions)}")

        # The model returns a dict like {"hey_jarvis_v0.1": 0.03, ...}.
        # We search loosely by wake word name to handle version suffixes in model keys.
        for key, score in predictions.items():
            if self._wake_word in key or key in self._wake_word:
                return float(score)

        # If no key matched by name, fall back to the first score in the dict.
        # This handles edge cases where the model returns an unexpected key format.
        if predictions:
            return float(next(iter(predictions.values())))

        return 0.0


# --- Raspberry Pi / ARM64 compatibility note ---
# openwakeword depends on tflite-runtime, which may not be available on ARM64.
# If installation fails on Raspberry Pi, use inference_framework="onnx" (already configured)
# and install onnxruntime instead — it works on ARM64 without issues.
#
# Lighter alternative: openwakeword-pruned removes training-related code,
# reducing memory usage. Worth considering for resource-constrained devices.