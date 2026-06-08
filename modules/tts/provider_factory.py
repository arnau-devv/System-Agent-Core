import os
from modules.tts.providers.elevenlabs import ElevenLabsProvider
from modules.tts.providers.edge_tts import EdgeTTSProvider

def create_tts_providers() -> list:
    providers = []
    
    # ElevenLabs — primary, best quality, requires API key and internet
    elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY")
    if elevenlabs_api_key:
        providers.append( 
            ElevenLabsProvider(
                api_key = os.getenv("ELEVENLABS_API_KEY"),
                model = os.getenv("ELEVENLABS_MODEL"),
                voice_id = os.getenv("ELEVENLABS_VOICE_ID")
            )
        )
    
    # EdgeTTS — fallback, free, requires internet, no API key
    edgetts_voice = os.getenv("EDGE_TTS_VOICE")
    if edgetts_voice:
        providers.append(EdgeTTSProvider(voice_id = edgetts_voice))

    if not providers:
        raise ValueError("No TTS providers configured in .env")

    return providers