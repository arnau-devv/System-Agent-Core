import asyncio
import numpy as np
from openwakeword.model import Model
from modules.wake_word.providers.base import BaseWakeWordProvider

class OpenWakeWordProvider(BaseWakeWordProvider):
    # Threshold for OpenWakeWord detection (0.0 to 1.0).
    # Higher values reduce false positives.
    VOICE_THRESHOLD = 0.5
    
    def __init__(self, model_instance: Model, wake_word: str):
        self._wake_word = wake_word
        self._model = model_instance
        self._loop_count = 0
        
    async def detect_wake_word(self, chunk: np.ndarray) -> bool:
        score = await self._wake_word_score(chunk)
        
        if score >= OpenWakeWordProvider.VOICE_THRESHOLD:
            print(f"\n[¡ÉXITO!] ¡Wake word detectada con puntuación: {score:.4f}!")
            return True
        else:
            return False
        
    async def _wake_word_score(self, chunk: np.ndarray) -> float:
        flat_chunk = chunk.flatten()
        
        # CORRECCIÓN: 'predict' devuelve directamente un diccionario con las puntuaciones.
        # Al capturar su retorno, evitamos usar 'prediction_accumulators' y solucionamos el error.
        predictions = await asyncio.to_thread(self._model.predict, flat_chunk)
        
        self._loop_count += 1
        # --- BLOQUE DE DIAGNÓSTICO (Cada ~2 segundos) ---
        if self._loop_count % 25 == 0:
            volumen_pico = np.max(np.abs(flat_chunk))
            print(f"[Telemetría] Vol. Micrófono: {volumen_pico} | Evaluando: {list(predictions.keys())} | Scores: {list(predictions.values())}")
        
        # Buscamos el score de Jarvis de forma tolerante a nombres (ej: "hey_jarvis" o "hey_jarvis_v0.1")
        for key, score in predictions.items():
            if self._wake_word in key or key in self._wake_word:
                return float(score)
        
        # Si la predicción tiene datos pero la clave varía, extraemos el primer valor por defecto
        if predictions:
            return float(next(iter(predictions.values())))
            
        return 0.0




# Problemas en Raspberry Pi / ARM64:
# Si estás intentando instalarlo en dispositivos tipo Raspberry Pi
# (especialmente con versiones recientes de Python o Linux), podrías
# encontrar errores debido a la dependencia `tflite-runtime`.
#
# En esos casos, la comunidad suele recomendar usar un fork del proyecto
# o instalar las dependencias manualmente, omitiendo `tflite-runtime`
# para utilizar `onnxruntime` como backend alternativo.

# Versiones alternativas:
# Existen variantes como `openwakeword-pruned`, una versión optimizada
# y más ligera que elimina el código relacionado con el entrenamiento
# de modelos. Puede ser una buena opción en entornos con recursos
# limitados o restricciones de memoria RAM.