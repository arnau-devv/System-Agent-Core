
import asyncio
from core.event_bus import EventBus
class StateManager:
    system_states = ["IDLE", "LISTENING", "PROCESSING_STT", "THINKING", "SPEAKING", "SPEAKING_DONE"]
    emotional_states = ["NEUTRAL", "HAPPY", "CONFUSED", "ANGRY"]
    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._queue = event_bus.subscribe("state_manager")
        self.system_state = "IDLE"
        self.emotional_state = "NEUTRAL"
        
    # Recieves a Event_Bus message -> {"name": event_name, "data": data} 
    async def run(self):
        # Always start the system in the IDLE state to ensure a
        # consistent initialization sequence and prevent startup
        # state transitions from interfering with each other.
        await self._event_bus.publish("IDLE", {})
        
        while True:
            message = await self._queue.get()
            state = message["name"]
            data = message["data"]
        
            if state in StateManager.system_states:
                self.system_state = state
                print(f"[StateManager] System state: {state}")
            elif state in StateManager.emotional_states:
                self.emotional_state = state
                print(f"[StateManager] Emotional state: {state}")
                
            if state == "SPEAKING_DONE":
                await self._event_bus.publish("KEEP_LISTENING", {})
                
