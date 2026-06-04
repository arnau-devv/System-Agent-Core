import asyncio

class EventBus:
    def __init__(self):
        self.queue = asyncio.Queue()
        
    async def publish(self, event_name, data):
        """ Publish: puts a message on queue"""
        message = {"name": event_name, "data": data}
        await self.queue.put(message)
        print(f"[EventBus] Send: {event_name}")
        
    async def listen(self):
        """Listen: gets a message form queue when one arrives"""
        message = await self.queue.get()
        return message