import pygame

# Configuration constants defining the alert "listening" appearance
EYE_WIDTH         = 120
EYE_HEIGHT_TARGET = 200
EYE_SPACING       = 40
BORDER_RADIUS     = 45

COLOR_EYE         = (0, 220, 220)

# Constants for controlling the spring-like animation transition
LERP_SPEED        = 0.22
OVERSHOOT         = 18
OVERSHOOT_DECAY   = 0.30

class ListeningAnimation:
    def __init__(self):
        # Tracks current state and overshoot for the bouncing effect
        self._eye_h        = 0.0    
        self._offset_x     = 0.0    
        self._overshoot    = 0.0
        self._peaked       = False

    def start_from(self, eye_h: float, offset_x: float):
        # Syncs animation start with current screen state for seamless switching
        self._eye_h     = eye_h
        self._offset_x  = offset_x
        self._overshoot = 0.0
        self._peaked    = False

    def draw(self, screen: pygame.Surface):
        # Orchestrates the two-phase animation: linear expansion followed by bouncy decay
        screen_w, screen_h = screen.get_size()

        if not self._peaked:
            self._eye_h += (EYE_HEIGHT_TARGET - self._eye_h) * LERP_SPEED
            if abs(self._eye_h - EYE_HEIGHT_TARGET) < 2.0:
                self._eye_h     = EYE_HEIGHT_TARGET
                self._overshoot = OVERSHOOT
                self._peaked    = True

        if self._peaked and self._overshoot > 0.1:
            self._overshoot *= (1.0 - OVERSHOOT_DECAY)
        else:
            self._overshoot = 0.0

        self._offset_x += (0.0 - self._offset_x) * LERP_SPEED

        self._draw_eyes(screen, screen_w, screen_h)

    def _draw_eyes(self, screen, screen_w, screen_h):
        # Renders the eyes, calculating y-position centered on dynamic height
        total_w  = EYE_WIDTH * 2 + EYE_SPACING
        left_x   = (screen_w - total_w) // 2 + int(self._offset_x)
        right_x  = left_x + EYE_WIDTH + EYE_SPACING

        rendered_h = int(self._eye_h + self._overshoot)
        eye_y      = (screen_h - rendered_h) // 2

        pygame.draw.rect(screen, COLOR_EYE, (left_x, eye_y, EYE_WIDTH, rendered_h), border_radius=BORDER_RADIUS)
        pygame.draw.rect(screen, COLOR_EYE, (right_x, eye_y, EYE_WIDTH, rendered_h), border_radius=BORDER_RADIUS)

    @property
    def eye_h(self) -> float:
        # Exposes the current height including overshoot for external state tracking
        return self._eye_h + self._overshoot

    @property
    def offset_x(self) -> float:
        # Exposes horizontal offset for animation engine consistency
        return self._offset_x