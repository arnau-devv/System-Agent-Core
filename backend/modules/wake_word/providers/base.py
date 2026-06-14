class BaseWakeWordProvider:
# Base class for wake word detection providers.
# Subclasses must implement listen() as an async method.
# Detection logic is handled here, but acting on it is handled by WakeWordService.
    async def listen(self):
        raise NotImplementedError("Wake word provider must implement listen()")