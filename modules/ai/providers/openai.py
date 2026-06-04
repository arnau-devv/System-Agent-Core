from modules.ai.providers.base import BaseProvider
from openai import AsyncOpenAI

class OpenAiProvider(BaseProvider):
    def __init__(self, api_key, model: str):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model
        
    # sends all chat history to AI model & returns AI response
    async def generate(self, chat_history):
        try: 
            # Call OpenAi API
            completion = await self._client.chat.completions.create(
                model = self._model,
                messages = chat_history,
                # tempeture: Controls how random or creative the response is
                # Low temperature → more deterministic, repetitive, and safe responses
                # High temperature → more creativity, variation, and randomness
                temperature = 0.7,
            )
            
            response_text = completion.choices[0].message.content.strip()
            return response_text
        
        # Exceptions pendent to solve
        except Exception as e:
            raise RuntimeError(f"[OpenAiProvider Error] {e}")