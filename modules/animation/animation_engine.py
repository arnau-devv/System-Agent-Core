import pygame
import threading
import asyncio
from core.state_manager import StateManager
from core.event_bus import EventBus
from modules.animation.animations.idle_animation import IdleAnimation
from modules.animation.animations.talking_animation import TalkingAnimation
from modules.animation.animations.listening_animation import ListeningAnimation
from modules.animation.glow_renderer import GlowRenderer

# Engine constants for display management
SCREEN_SIZE = (480, 480)
FPS = 60

class AnimationEngine:
    # The orchestrator of the animation system.
    # Handles state management, animation selection, and ensures smooth
    # transitions between different animation classes.
    def __init__(self, event_bus: EventBus):
        self._system_states = StateManager.SYSTEM_STATES
        self._event_bus = event_bus
        self._current_state = "IDLE"
        self._prev_state    = None
        self._queue = self._event_bus.subscribe("animation_engine")

        # Initialize animation state instances
        self._idle_animation      = IdleAnimation()
        self._listening_animation = ListeningAnimation()
        self._talking_animation   = TalkingAnimation()
        
        # Initialize the post-processing glow renderer
        self._glow_renderer = GlowRenderer(SCREEN_SIZE)

        # Separate thread to run the Pygame loop without blocking main app execution
        self._thread = threading.Thread(target=self._animation_loop, daemon=True)
        self._thread.start()

    def _animation_loop(self):
        pygame.init()
        screen = pygame.display.set_mode(SCREEN_SIZE)
        pygame.display.set_caption("System Agent Core")
        clock = pygame.time.Clock()

        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    return

            # Check for state changes to trigger parameter handoff (prevents visual snapping)
            if self._current_state != self._prev_state:
                self._on_state_change()
                self._prev_state = self._current_state

            # Centralized rendering: uses the GlowRenderer to draw the active animation
            active_animation = self._get_active_animation()
            
            if active_animation:
                # Passes the active draw method as a callback to the glow decorator
                self._glow_renderer.render(screen, active_animation.draw)

            pygame.display.flip()
            clock.tick(FPS)

    def _get_active_animation(self):
        # Maps system states to their corresponding animation logic class
        if self._current_state == "IDLE":
            return self._idle_animation
        elif self._current_state in ("LISTENING", "WAKE_DETECTED"):
            return self._listening_animation
        elif self._current_state == "SPEAKING":
            return self._talking_animation
        return None

    def _on_state_change(self):
        # Handles seamless handoff between animation states.
        # Extracts current eye metrics from the outgoing animation and
        # seeds them into the incoming animation to maintain continuity.
        animation_map = {
            "IDLE": self._idle_animation,
            "LISTENING": self._listening_animation,
            "WAKE_DETECTED": self._listening_animation,
            "SPEAKING": self._talking_animation
        }

        # Retrieve current metrics from the previous animation
        if self._prev_state in animation_map:
            prev = animation_map[self._prev_state]
            eye_h = getattr(prev, 'eye_h', 45.0)
            offset_x = getattr(prev, 'offset_x', 0.0)
        else:
            eye_h, offset_x = 45.0, 0.0

        # Inject metrics into the next animation state
        if self._current_state in animation_map:
            animation_map[self._current_state].start_from(eye_h=eye_h, offset_x=offset_x)

    async def run(self):
        # Async bridge to consume state updates from the system event bus
        while True:
            message = await self._queue.get()
            if message["name"] in self._system_states:
                self._current_state = message["name"]