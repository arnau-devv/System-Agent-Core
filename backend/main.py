import asyncio
import uvicorn
from ws_server import app as ws_app
from pathlib import Path
from dotenv import load_dotenv
from core.event_bus import EventBus
from core.state_manager import StateManager
from modules.ai.ai_service import AiService
from modules.tts.tts_service import TtsService
from modules.stt.stt_service import SttService
from modules.sound.sound_engine import SoundEngine
from modules.stt.audio_recorder import AudioRecorder
from modules.wake_word.wake_word_service import WakeWordService

load_dotenv(Path(__file__).resolve().parent / ".env")

async def main():
    try:
        event_bus           = EventBus()
        state_manager       = StateManager(event_bus)
        audio_recorder      = AudioRecorder()
        wake_word_service   = WakeWordService(event_bus, audio_recorder)        
        stt_service         = SttService(event_bus, audio_recorder)
        ai_service          = AiService(event_bus)
        tts_service         = TtsService(event_bus)
        sound_engine        = SoundEngine(event_bus)
        
        await asyncio.sleep(0.1)
        
        async def run_server():
            config = uvicorn.Config(ws_app, host="127.0.0.1", port=8000, log_level="info")
            server = uvicorn.Server(config)
            await server.serve()

        await asyncio.gather(
            sound_engine.run(),
            wake_word_service.run(),
            state_manager.run(),
            ai_service.run(),
            tts_service.run(),
            stt_service.run(),
            run_server()
        )
    except Exception as e:
        print(f"ERROR: {e}")
        raise

asyncio.run(main())