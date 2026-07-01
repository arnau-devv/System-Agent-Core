import json
import ws_server
from core.event_bus import EventBus
from datetime import datetime, timedelta
from modules.ai.provider_factory import create_llm_providers
from modules.ai.system_prompt_builder import SystemPromptBuilder

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
        self._provider_names = [p.get_name() for p in self._providers]
        self._provider_cooldowns = {}
        self._chat_history = [ { "role": "system", "content": SystemPromptBuilder.generate_base_prompt()} ]
        # System "content" defines the agent's personality and language.
        self._system_prompt_builder = SystemPromptBuilder(self._chat_history)

    # Appends a message to the conversation history.
    # Called before and after each API call to keep the full context.
    def _add_message(self, role: str, content: str):
        self._chat_history.append({"role": role, "content": content})
        
    async def run(self):
        # WebSocket -> Sends all LLM provider names to the frontend
        await self._ws_send("LLM_PROVIDER_NAMES", self._provider_names)
        while True:
            message = await self._queue.get()
            if message["name"] == "STT_DONE":
                await self._event_bus.publish("THINKING", {})
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
                response = await provider.generate_text(self._chat_history)
                # sends via websocket -> active provider
                await self._ws_send("ACTIVE_LLM_PROVIDER", provider.get_name())
                return response
            except RuntimeError as e:
                # Any failure — cooldown 5 minutes before retrying
                self._provider_cooldowns[provider] = datetime.now() + timedelta(minutes=5)
                print(f"[AiService] Provider failed, cooldown 5min: {e}")
        # publish via websocket -> all providers failed
        await self._ws_send("ALL_LLM_PROVIDERS_DOWN", "")
        print("[AiService] All providers failed")
        
        return None
    
    async def _ws_send(self, name: str, data: str | list):
        if ws_server.connected_socket:
            try: await ws_server.connected_socket.send_text(json.dumps({"name": name, "data": data}))
            except Exception: pass