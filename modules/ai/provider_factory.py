import os
from modules.ai.providers.groq import GroqProvider
from modules.ai.providers.openai import OpenAiProvider


# Reads AI_PROVIDER from .env and returns the corresponding provider instance.
# Adding a new provider only requires creating its class and registering it here.
def create_llm_provider():
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
    
    raise ValueError(f"Unsupported LLM provider: {provider_name}")  