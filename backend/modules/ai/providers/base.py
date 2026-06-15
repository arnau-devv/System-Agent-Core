# Base class for all AI providers.
# Defines the interface every provider must implement.
# Allows AiService to work with any provider without knowing its internals.
class BaseLLMProvider:
    def __init__(self, model: str, name: str):
        self._model: str = model
        self._name: str = name
        self._client = None

    async def generate_text(self, messages: list) -> str:
        raise NotImplementedError("LLM provider must implement generate_text()")
    
    def get_name(self): return self._name