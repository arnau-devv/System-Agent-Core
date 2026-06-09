from openwakeword.model import Model
from openwakeword.utils import download_models
from modules.wake_word.providers.open_wake_word.openwakeword import OpenWakeWordProvider

def create_wake_word_providers() -> list:
    providers = []

    # --- Configuración de OpenWakeWord ---    
    # 1. Usamos la función oficial para descargar de forma nativa TODO lo necesario.
    # Esto descargará de golpe hey_jarvis_v0.1.onnx, melspectrogram, embeddings, etc.
    print("[WakeWordFactory] Verificando y descargando modelos oficiales de openWakeWord...")
    try:
        download_models()
        print("[WakeWordFactory] ¡Modelos base y wake words descargados con éxito!")
    except Exception as e:
        print(f"[WakeWordFactory] Advertencia durante la descarga automática: {e}")

    # 2. Usamos el identificador limpio de Jarvis que reconoce la librería internamente
    wake_word_key = "hey_jarvis"
    
    # 3. Inicializamos el modelo con ONNX Runtime (que ya está listo en tu venv)
    # Al pasarle inference_framework="onnx", buscará la versión ONNX descargada en el paso 1.
    onnx_model = Model(wakeword_models=[wake_word_key], inference_framework="onnx")
    
    # 4. Inyectamos la instancia al proveedor asíncrono
    providers.append(OpenWakeWordProvider(model_instance=onnx_model, wake_word=wake_word_key))    
    
    return providers