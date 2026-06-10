from core.event_bus import EventBus
from datetime import datetime, timedelta
from modules.ai.provider_factory import create_llm_providers

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
        self._providers = create_llm_providers()
        # Tracks when each provider is available again after a failure
        self._provider_cooldowns = {}
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
        
    async def run(self):
        # Listens for STT_DONE events and triggers the response cycle
        while True:
            message = await self._queue.get()
            if message["name"] == "STT_DONE":
                user_input = message["data"]["user_input"]
                await self._handle_user_input(user_input)

    async def _handle_user_input(self, user_input: str):
        # Orchestrates the full response cycle for a single user input
        print(f"[AiService] Received: '{user_input}'")
        self._add_message("user", user_input)
        await self._event_bus.publish("THINKING", {})
        response = await self._generate_response()
        if response:
            self._add_message("assistant", response)
            await self._event_bus.publish("AI_DONE", {"response": response})
        else:
            await self._event_bus.publish("IDLE", {})

    async def _generate_response(self) -> str | None:
        # Tries each provider in order until one succeeds
        for provider in self._providers:
            if datetime.now() < self._provider_cooldowns.get(provider, datetime.min):
                continue
            try:
                return await provider.generate_text(self._chat_history)
            except RuntimeError as e:
                # Any failure — cooldown 5 minutes before retrying
                self._provider_cooldowns[provider] = datetime.now() + timedelta(minutes=5)
                print(f"[AiService] Provider failed, cooldown 5min: {e}")
        print("[AiService] All providers failed")
        return None