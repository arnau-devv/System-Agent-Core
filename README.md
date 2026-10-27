# System Agent Core

A voice agent that listens for a wake word, transcribes speech locally, and replies with AI-generated voice, with animated eyes on a 480×480 display.

> Paused: this is the original backend-only version, designed for a Raspberry Pi 4 device. Development continues in the [`agent-pc`](https://github.com/arnau-devv/System-Agent-Core/tree/agent-pc) branch, which adds a desktop interface.

## Features
- Detects the configured wake word with OpenWakeWord (default: `hey_jarvis`).
- Records microphone audio, detects the end of speech by volume, and transcribes Spanish speech locally with faster-whisper.
- Keeps the conversation going without repeating the wake word, and returns to idle after 4 seconds of silence.
- Generates responses with Groq or OpenAI, and speaks them through ElevenLabs (streaming) or Edge TTS.
- Falls back to the next provider automatically when one fails.
- Animates eyes with Pygame at 60 FPS (idle, listening, speaking) with smooth transitions between states.
- Plays sound effects when a conversation starts and ends.

## Architecture

Each service (wake word, speech-to-text, AI, text-to-speech, animation, sound) runs independently and communicates only through an asynchronous event bus, so any module can be replaced without touching the others. A state manager tracks the global state and drives the animations. Provider factories isolate each LLM, TTS, and wake-word implementation; LLM and TTS services try the configured providers in order and put a failing provider on a five-minute cooldown. Pygame runs in a dedicated thread so it never blocks the event loop. The event bus is abstracted so it can be swapped for MQTT in the future.

## Tech stack
- **Backend:** Python, asyncio, Pygame, faster-whisper, sounddevice.
- **Providers:** Groq/OpenAI (LLM), ElevenLabs/Edge TTS (TTS), OpenWakeWord (wake word).
- **Target hardware:** Raspberry Pi 4, ReSpeaker 2-Mics HAT, 4" 480×480 display.

## Project structure
```text
core/                    # Event bus and system state manager
modules/                 # Wake word, STT, AI, TTS, animation, and sound services
main.py                  # Entry point
```

## Getting started

**Requirements:** Python 3.11 or newer, a microphone, and an audio output device. Developed and tested on a PC; it has not been tested on a Raspberry Pi yet.

1. Create a Python environment and install dependencies:

   ```bash
   python -m venv venv
   venv\Scripts\activate        # Linux/macOS: source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Create a `.env` file in the project root with the provider variables below. Set at least one LLM provider and one TTS provider; model and voice values must be valid for the selected provider.

   ```dotenv
   GROQ_API_KEY=
   GROQ_AI_MODEL=
   OPENAI_API_KEY=
   OPENAI_AI_MODEL=
   EDGE_TTS_VOICE=
   ELEVENLABS_API_KEY=
   ELEVENLABS_MODEL=
   ELEVENLABS_VOICE_ID=
   WAKE_WORD=
   ```

   `WAKE_WORD` defaults to `hey_jarvis` when omitted. `EDGE_TTS_VOICE` enables Edge TTS; ElevenLabs requires its API key, model, and voice ID.

3. Start the agent:

   ```bash
   python main.py
   ```

## Branches
`main` is the original backend-only version designed for a Raspberry Pi device and is paused. `agent-pc` is the full desktop application.