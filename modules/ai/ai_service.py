from modules.ai.provider_factory import create_provider


# ---- ---- ---- ---- ---- ---- ---- ---- ---- ---- 
# AI CHAT MESSAGES ROLES:
# system        → system rules
# user          → user messages/inputs
# assistant     → AI responses

class AiService:
    def __init__(self):
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
    async def get_ai_response(self, user_input: str):
        # Add user input to chat history
        self._add_message("user", user_input)
        # AI API uses last message from chat history to return a response
        response = await self._provider.generate(self._chat_history)
        # Add AI response to chat history
        self._add_message("assistant", response)

        return response
