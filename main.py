import asyncio
from pathlib import Path
from dotenv import load_dotenv
from core.event_bus import EventBus
from core.state_manager import StateManager
from modules.ai.ai_service import AiService
from modules.tts.tts_service import TtsService
from modules.stt.stt_service import SttService

load_dotenv(Path(__file__).resolve().parent / ".env")

async def main():
    try:
        event_bus = EventBus()
        state_manager = StateManager(event_bus)
        ai_service = AiService(event_bus)
        tts_service = TtsService(event_bus)
        stt_service = SttService(event_bus)

        # Simulates wake word detection with Enter key.
        # Replace with wake_word_service.run() when WakeWordService is implemented.
        async def simulate_wake_word():
            loop = asyncio.get_running_loop()
            while True:
                await loop.run_in_executor(None, input, "\n[Press Enter to speak]\n")
                if state_manager.system_state == "IDLE":
                    await event_bus.publish("WAKE_DETECTED", {})

        await asyncio.gather(
            simulate_wake_word(),
            state_manager.run(),
            ai_service.run(),
            tts_service.run(),
            stt_service.run(),
        )
    except Exception as e:
        print(f"ERROR: {e}")
        raise

asyncio.run(main())