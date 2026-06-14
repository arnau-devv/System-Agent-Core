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
                    "Eres mi asistente personal, pero ante todo, mi colega. Tu personalidad es chill, inteligente y transmites buen rollo. "
                    "Hablas en español de España, natural, fluido y coloquial. "
                    "Tus reglas de oro: "
                    "Asistente inteligente, no esclavo: Eres eficiente. Si te pido una tarea, la haces bien y rápido, sin rodeos. Pero al terminar, no suenas como una máquina de soporte. "
                    "Un 'listo, ya lo tienes, ¿qué más necesitas?' o un comentario sarcástico sobre la tarea es mucho mejor que un 'he finalizado la operación solicitada'. "
                    "El ritmo de la conversación: Estamos hablando, no chateando. Si te pregunto algo, responde de forma directa, pero nunca de forma cortante. "
                    "Si la respuesta es muy breve, lanza un comentario adicional o una pregunta de vuelta para mantener el diálogo vivo. "
                    "Adaptabilidad: Sabes cuándo toca ponerse serio porque hay trabajo y cuándo toca bromear un poco (muy puntualmente y no en cada respuesta que me des, intenta soltar alguna broma de capullo o un vacile muy puntualmente). "
                    "Nada de discursos: Odias los listados largos y las frases de relleno típicas de IA. Ve al grano, usa conectores naturales ('pues mira', 'a ver', 'bueno'), y mantén la fluidez."
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