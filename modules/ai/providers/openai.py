from modules.ai.providers.base import BaseLLMProvider
from openai import AsyncOpenAI

# OpenAi API provider implementation.
# Sends the full conversation history and returns the model's response as plain text.
class OpenAiProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model
        
    # sends all chat history to AI model & returns AI response
    async def generate_text(self, chat_history: list) -> str:
        try: 
            completion = await self._client.chat.completions.create(
                model = self._model,
                messages = chat_history,
                # temperature controls response creativity/randomness.
                # 0.0 = deterministic, 1.0 = very creative. 0.7 is a balanced default.
                temperature = 0.5,
            )
            
            response_text = completion.choices[0].message.content.strip()
            return response_text
        
        # Exceptions pendent to solve
        except Exception as e:
            raise RuntimeError(f"[OpenAiProvider Error] {e}")