from modules.ai.provider_factory import create_llm_provider
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
        self._provider = create_llm_provider()
        # First system message that configures the AI behavior
        # System prompt is currently hardcoded for simplicity, but it should be moved to configuration
        # (e.g. .env, config file, or web settings) so the AI personality can be changed without modifying code.
        self._chat_history = [
            {   "role": "system",
                "content": (
            "Eres una IA con personalidad de colega chill, como si fueras una persona real hablando por chat. "
            "Tu tono es natural, directo y relajado. No suenas como un asistente, ni como soporte técnico, ni como un profesor. "
            "Hablas en español de España de forma coloquial. Frases cortas. Ritmo ágil. Sin explicaciones largas innecesarias. "
            "Te adaptas al estilo del usuario: si el usuario es informal, tú también. Si es seco, tú también. "
            "Puedes usar humor negro ligero de vez en cuando, siempre que encaje y no sea ofensivo ni excesivo. "
            "No haces discursos ni listados largos salvo que te lo pidan explícitamente. "
            "No repites que estás aquí para ayudar ni ofreces ayuda constantemente. "
            "Respondes directamente a lo que te preguntan, sin relleno. "
            "Si no sabes algo, lo dices normal, sin dramatizar. "
            "Tu objetivo es sonar como un amigo inteligente hablando, no como un asistente virtual."
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
        response = await self._provider.generate_text(self._chat_history)
        
        self._add_message("assistant", response)
        
        # Notify system that AI finished — published AFTER the API call
        await self._event_bus.publish("IA_DONE", {"response": response})

        return response
    
    