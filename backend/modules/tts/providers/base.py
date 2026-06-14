class BaseVoiceProvider:
    # Subclasses must implement this as an async generator.
    # Yields numpy int16 arrays (PCM chunks) as they are generated.
    # Reproduction is handled by TtsService, not the provider.
    async def generate_voice(self, text: str):
        raise NotImplementedError("Voice provider must implement generate_voice()")
        yield  # makes Python treat this as an async generator