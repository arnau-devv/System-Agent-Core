import os
from modules.ai.providers.groq import GroqProvider
from modules.ai.providers.openai import OpenAiProvider


def create_llm_providers() -> list:
    providers = []
    
    # Groq — primary, ultra-low latency, requires API key and internet
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key:
        providers.append(
            GroqProvider(
                api_key = groq_api_key, 
                model = os.getenv("GROQ_AI_MODEL")
            )
        )
        
    # OpenAI — secondary/robust, high model variety, requires API key and internet
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        providers.append(
            OpenAiProvider(
                api_key = openai_api_key,
                model = os.getenv("OPENAI_AI_MODEL")
            )
        )
    
    if not providers:
            raise ValueError("No LLM providers configured in .env")

    return providers