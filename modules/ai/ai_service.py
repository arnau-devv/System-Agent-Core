from modules.ai.provider_factory import create_llm_provider
from core.event_bus import EventBus

# AI chat message roles:
# system    → initial instructions that define the agent's behavior and personality
# user      → transcribed voice input from the user (via STT)
# assistant → AI responses, stored to maintain conversation context

# Central AI module. Manages conversation history and coordinates the AI response cycle.
# Agnostic to the underlying provider — switching models only requires .env changes.
class AiService:
    def __init__(self, event_bus: EventBus):
        self._event_bus = event_bus
        self._queue = event_bus.subscribe("ai_service")
        self._provider = create_llm_provider()
        # System prompt defines the agent's personality and language.
        # Currently hardcoded — should be moved to .env or web config
        # so it can be changed without touching code.
        self._chat_history = [
            {
                "role": "system",
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

    # Appends a message to the conversation history.
    # Called before and after each API call to keep the full context.
    def _add_message(self, role: str, content: str):
        self._chat_history.append({"role": role, "content": content})

    # Main service loop — listens for STT_DONE events.
    # Sends the transcribed text to the AI provider and publishes the response.
    # Maintains full conversation history so the AI has context across turns.
    async def run(self):
        while True:
            message = await self._queue.get()

            if message["name"] == "STT_DONE":
                user_input = message["data"]["user_input"]
                print(f"[AiService] Received: '{user_input}'")
                self._add_message("user", user_input)

                # Notify system before API call — lets animation react immediately
                await self._event_bus.publish("THINKING", {})

                # API call — awaited so other coroutines run while waiting for response
                response = await self._provider.generate_text(self._chat_history)
                self._add_message("assistant", response)

                # Notify system after API call — triggers TTS playback
                await self._event_bus.publish("AI_DONE", {"response": response})
                

