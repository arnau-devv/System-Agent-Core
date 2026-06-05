import asyncio
from pathlib import Path
from dotenv import load_dotenv
from core.event_bus import EventBus
from core.state_manager import StateManager
from modules.ai.ai_service import AiService
from modules.tts.tts_service import TtsService

load_dotenv(Path(__file__).resolve().parent / ".env")

async def main():
    try:
        event_bus = EventBus()
        state_manager = StateManager(event_bus)
        ai_service = AiService(event_bus)
        tts_service = TtsService(event_bus)

        async def test_input():
            loop = asyncio.get_running_loop()
            while True:
                # run_in_executor runs input() in a thread so asyncio isn't blocked
                user_input = await loop.run_in_executor(None, input, "Usuario: ")
                if not user_input.strip():
                    continue
                response = await ai_service.get_ai_response(user_input)
                print(f"IA: {response}")

        await asyncio.gather(
            test_input(),
            state_manager.put_states(),
            tts_service.run(),
        )
    except Exception as e:
        print(f"ERROR: {e}")
        raise

asyncio.run(main())