import os
from openwakeword.model import Model
from openwakeword.utils import download_models
from modules.wake_word.providers.open_wake_word.openwakeword import OpenWakeWordProvider

# Wake word used for activation — must match an available model name in each provider
WAKE_WORD = os.getenv("WAKE_WORD", "hey_jarvis")  # default to hey_jarvis if not set


def create_wake_word_providers() -> list:
    providers = []

    # OpenWakeWord — current provider, open source, no API key required
    _ensure_models_downloaded()
    # Loads the ONNX model for the given wake word.
    # inference_framework="onnx" uses the downloaded .onnx file directly,
    # which is faster and more compatible than the tflite alternative.
    model = Model(wakeword_models=[WAKE_WORD], inference_framework="onnx")
    providers.append(OpenWakeWordProvider(model_instance=model, wake_word=WAKE_WORD))

    # Porcupine — future provider, better accuracy, requires API key
    # porcupine_key = os.getenv("PORCUPINE_API_KEY")
    # if porcupine_key:
    #     providers.append(PorcupineProvider(api_key=porcupine_key, wake_word=WAKE_WORD))

    if not providers:
        raise ValueError("No wake word providers configured")

    return providers

def _ensure_models_downloaded():
    # Downloads base models and wake word files on first run.
    # Safe to call every startup — skips download if already cached.
    print("[WakeWordFactory] Checking OpenWakeWord models...")
    try:
        download_models()
        print("[WakeWordFactory] Models ready.")
    except Exception as e:
        print(f"[WakeWordFactory] Warning during model download: {e}")
