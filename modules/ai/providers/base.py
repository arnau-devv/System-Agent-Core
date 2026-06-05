# Base class for all AI providers.
# Defines the interface every provider must implement.
# Allows AiService to work with any provider without knowing its internals.
class BaseLLMProvider:
    # Subclasses must override this method.
    # messages: full conversation history in OpenAI chat format
    # [{"role": "user/assistant/system", "content": "..."}]
    async def generate_text(self, messages: list) -> str:
        raise NotImplementedError("LLM provider must implement generate_text()")