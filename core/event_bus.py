import asyncio

    # Central message bus for inter-module communication.
    # Modules publish events here without knowing who listens.
    # The StateManager consumes events and reacts accordingly.
    # Internally uses asyncio.Queue — designed to migrate to MQTT in the future
    # without changing the public interface.
class EventBus:
    def __init__(self):
        self._queue = asyncio.Queue()
        
    # Publish an event to the bus.
    # Any module can call this without knowing who will consume it.
    async def publish(self, event_name: str, data: dict):
        message = {"name": event_name.upper(), "data": data}
        await self._queue.put(message)
        print(f"[EventBus] Send: {event_name}")
    
    # Wait for the next event and return it.
    # Suspends execution (await) until a message is available,
    # allowing other coroutines to run in the meantime.  
    async def listen(self):
        message = await self._queue.get()
        return message