import asyncio

class EventBus:
    # Central message bus for inter-module communication.
    # Modules publish events here without knowing who listens.
    # The StateManager consumes events and reacts accordingly.
    # Internally uses asyncio.Queue — designed to migrate to MQTT in the future
    # without changing the public interface.
    def __init__(self):
        self._subscribers: dict[str, asyncio.Queue] = {}

    # Register a new subscriber and return its personal queue.
    # Each module calls this once at startup.
    def subscribe(self, name: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        self._subscribers[name] = queue
        print(f"[EventBus] Subscriber registered: {name}")
        return queue

    # Publish an event to ALL subscribers simultaneously.
    # Any module can call this without knowing who listens.
    async def publish(self, event_name: str, data: dict):
        message = {"name": event_name.upper(), "data": data}
        for queue in self._subscribers.values():
            await queue.put(message)
        print(f"[EventBus] Published: {event_name}")