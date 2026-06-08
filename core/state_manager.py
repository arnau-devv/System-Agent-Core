
import asyncio
from core.event_bus import EventBus
class StateManager:
    system_states = ["IDLE",  "WAKE_DETECTED", "LISTENING", "PROCESSING_STT", "THINKING", "AI_DONE", "SPEAKING", "SPEAKING_DONE"]
    emocional_states = ["NEUTRAL", "HAPPY", "CONFUSED", "ANGRY"]
    def __init__(self, event_bus: EventBus):
        self._queue = event_bus.subscribe("state_manager")
        self.system_state = "IDLE"
        self.emocional_state = "NEUTRAL"
        
    # Recieves a Event_Bus message -> {"name": event_name, "data": data} 
    async def run(self):
        while True:
            message = await self._queue.get()
            state = message["name"]
            data = message["data"]
        
            if state in StateManager.system_states:
                self.system_state = state
                print(f"[StateManager] System state: {state}")
            elif state in StateManager.emocional_states:
                self.emocional_state = state
                print(f"[StateManager] Emotional state: {state}")
