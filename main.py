import asyncio
from pathlib import Path
from dotenv import load_dotenv
from modules.ai.ai_service import AiService
from core.event_bus import EventBus
from core.state_manager import StateManager

load_dotenv(Path(__file__).resolve().parent / ".env")

async def main():
    try:
        event_bus = EventBus()
        mi_assistant = AiService(event_bus)
        state_manager = StateManager(event_bus)

        async def test_input():
            await asyncio.sleep(0.1)
            while True:
                user_input = input("Ask anything to AI: ")
                response = await mi_assistant.get_ai_response(user_input)
                print(response)
                await asyncio.sleep(1)
                await event_bus.publish("IDLE", {})
                await asyncio.sleep(1)

        await asyncio.gather(
            test_input(),
            state_manager.put_states(),
        )
    except Exception as e:
        print(f"ERROR: {e}")
        raise
    
asyncio.run(main())