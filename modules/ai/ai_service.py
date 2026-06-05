from modules.ai.provider_factory import create_provider
from core.event_bus import EventBus

# ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- 
# AI CHAT MESSAGES ROLES:
# system        → system rules
# user          → user messages/inputs
# assistant     → AI responses


# Central AI module. Manages conversation history and exposes get_ai_response().
# Agnostic to the underlying provider — switching models only requires .env changes.
class AiService:
    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._provider = create_provider()
        # First system message that configures the AI behavior
        # System prompt is currently hardcoded for simplicity, but it should be moved to configuration
        # (e.g. .env, config file, or web settings) so the AI personality can be changed without modifying code.
        self._chat_history = [
            {   "role": "system",
                "content": (
                    "You are a helpful assistant. "
                    "You must always respond in Spanish."
                )
            }
        ]
        
    # Add message to history
    def _add_message(self, role: str, content: str):
        self._chat_history.append({"role": role, "content": content})
    
    # Call IA API to return a response    
    async def get_ai_response(self, user_input: str) -> str:
        self._add_message("user", user_input)
        
        # Notify system that AI is now processing — published BEFORE the API call
        await self._event_bus.publish("THINKING", {})
        
        # API call — this is the slow part, other tasks can run while waiting
        response = await self._provider.generate(self._chat_history)
        
        self._add_message("assistant", response)
        
        # Notify system that AI finished — published AFTER the API call
        await self._event_bus.publish("IA_DONE", {"response": response})

        return response
