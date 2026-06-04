import asyncio
from pathlib import Path
from dotenv import load_dotenv
from modules.ai.ai_service import AiService

load_dotenv(Path(__file__).resolve().parent / ".env")

async def main():
    mi_assistant = AiService()

    while True:
        my_input = input("Ask AI: ")
        if not my_input:
            break

        ai_response = await mi_assistant.get_ai_response(my_input)
        print(ai_response)

asyncio.run(main())