import os
import pygame
from pygame import mixer

class AudioManager:
    # Loads and plays the application's audio assets.
    # Sound files are loaded on demand and cached in memory
    # to avoid repeated disk access and reduce playback latency.
    def __init__(self):
        pygame.mixer.init()
        
        self._base_dir = os.path.dirname(__file__)
        self._sounds_dir = os.path.join(self._base_dir, "sounds")
        
        # Cache loaded sounds so each file is loaded only once.
        # This reduces disk I/O and provides near-instant playback
        # for frequently used sound effects.
        self._sounds = {}
        
    def load(self, name: str) -> mixer.Sound:
        # Return the cached sound if it has already been loaded.
        # This avoids repeatedly reading the same file from disk
        # and creating duplicate Sound objects in memory.
        print("[AudioManager] LOOKING IN:", self._sounds_dir)
        print("[AudioManager] FILES:", os.listdir(self._sounds_dir))
        if name in self._sounds:
            return self._sounds[name]
            
        path = os.path.join(self._sounds_dir, name)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"[AudioManager] Audio not found [!]: {path}")
        
        # Saves the audio as a pygame Sound object into sounds 'cache'
        sound = pygame.mixer.Sound(path)
        self._sounds[name] = sound
        
        return sound
    
    def play(self, name: str):
        sound = self.load(name)
        sound.play()
        
    def stop_all(self):
        pygame.mixer.stop()