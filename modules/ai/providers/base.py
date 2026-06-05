# Base class for all AI providers.
# Defines the interface every provider must implement.
# Allows AiService to work with any provider without knowing its internals.
class BaseProvider:
    # Subclasses must override this method.
    # messages: full conversation history in OpenAI chat format
    # [{"role": "user/assistant/system", "content": "..."}]
    async def generate(self, messages: list) -> str:
        raise NotImplementedError("Provider must implement generate()")