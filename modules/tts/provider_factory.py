import os
from modules.tts.providers.elevenlabs import ElevenLabsProvider

def create_tts_provider():
    provider_name = os.getenv("TTS_PROVIDER")
    
    if not provider_name:
        raise ValueError("Missing required environment variable: 'TTS_PROVIDER'")
    
    provider_name = provider_name.lower().strip()
    
    if provider_name == "elevenlabs":
        return ElevenLabsProvider(
            api_key = os.getenv("ELEVENLABS_API_KEY"),
            model = os.getenv("ELEVENLABS_MODEL"),
            voice_id = os.getenv("ELEVENLABS_VOICE_ID")
        )
    
    raise ValueError(f"Unsupported TTS provider: {provider_name}")  