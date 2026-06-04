import os
from modules.ai.providers.groq import GroqProvider
from modules.ai.providers.openai import OpenAiProvider


def create_provider():
    provider_name = os.getenv("AI_PROVIDER")

    if not provider_name:
        raise ValueError("Missing required environment variable: 'AI_PROVIDER'")
    
    provider_name = provider_name.lower().strip()
    
    if provider_name == "groq":
        return GroqProvider(
            api_key = os.getenv("GROQ_API_KEY"), 
            model = os.getenv("GROQ_AI_MODEL")
        )
        
    
    elif provider_name == "openai":
        return OpenAiProvider(
            api_key = os.getenv("OPENAI_API_KEY"),
            model = os.getenv("OPENAI_AI_MODEL")
        )
    
    raise ValueError(f"Unsupported provider: {provider_name}")  