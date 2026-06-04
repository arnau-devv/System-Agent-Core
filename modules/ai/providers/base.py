class BaseProvider:
    async def generate(self, messages):
        raise NotImplementedError("Provider must implement generate()")