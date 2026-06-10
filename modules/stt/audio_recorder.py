import queue
import asyncio
import numpy as np
import sounddevice as sd

# --- Audio parameters ---
SAMPLE_RATE = 16000       # Hz — required by faster-whisper
CHANNELS = 1              # mono
DTYPE = np.int16          # standard PCM format
CHUNK_DURATION = 0.1      # seconds per chunk (100 ms)
CHUNK_SIZE = int(SAMPLE_RATE * CHUNK_DURATION)

# --- Detection parameters ---
VOICE_THRESHOLD = 400     # Minimum RMS level to consider speech detected — tune as needed
SILENCE_DURATION = 1.0    # Seconds of silence before considering the utterance finished
VOICE_TIMEOUT = 4.0       # Maximum time to wait for speech before cancelling


class AudioRecorder:
    def __init__(self):
        self._q = queue.Queue()
        
    # Clears any pending residual audio from the microphone buffer.
    def _flush(self):
        while not self._q.empty():
            try:
                self._q.get_nowait()
            except queue.Empty:
                break
            
    # Records audio from the default microphone until speech is detected and ends.
    # Returns the recorded audio as a numpy int16 array, or None if timeout.
    async def record(self) -> np.ndarray | None:
        self._flush()
        audio_chunks = []
        silence_counter = 0.0
        voice_detected = False
        elapsed_waiting = 0.0

        def callback(indata, frames, time, status):
            # Called by sounddevice on a separate thread for each chunk
            # frames, time and status are required by sounddevice but not used here
            self._q.put(indata.copy())

        try:
            with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS,
                                dtype=DTYPE, blocksize=CHUNK_SIZE,
                                callback=callback):
                while True:
                    await asyncio.sleep(CHUNK_DURATION)
                    try: 
                        chunk = self._q.get_nowait()
                    except queue.Empty:
                        continue
                    
                    rms = np.sqrt(np.mean(chunk.astype(np.float32) ** 2))

                    if not voice_detected:
                        # Waiting for voice to start
                        elapsed_waiting += CHUNK_DURATION
                        
                        if rms > VOICE_THRESHOLD:
                            voice_detected = True
                            silence_counter = 0.0
                        
                        elif elapsed_waiting >= VOICE_TIMEOUT:
                            # No voice detected within timeout — cancel
                            return None
                    else:
                        # Voice already detected — checking for silence
                        audio_chunks.append(chunk)
                        
                        if rms < VOICE_THRESHOLD:
                            silence_counter += CHUNK_DURATION
                            if silence_counter >= SILENCE_DURATION:
                                # Silence long enough — end of speech
                                break
                        else:
                            # Voice again — reset silence counter
                            silence_counter = 0.0
        except Exception as e:
            print(f"[AudioRecorder] Microphone error: {e}")
            return None

        # Concatenate all chunks into a single array
        return np.concatenate(audio_chunks, axis=0).flatten()