import pygame
import time
import math

# Base geometry constants for consistency across states
EYE_WIDTH           = 120
EYE_SPACING         = 40
BASE_HEIGHT         = 200
BASE_RADIUS         = 45

# Parameters defining the speech animation rhythm and deformation
SHRINK_PERCENT      = 0.15
RADIUS_INCREASE     = -15
ANIM_SPEED          = 7.5

COLOR_EYE           = (0, 220, 220)

class TalkingAnimation:
    def __init__(self):
        self._start_time = 0.0
        self._offset_x   = 0.0

    def start_from(self, eye_h: float, offset_x: float):
        # Captures start time to synchronize sine waves upon initiation
        self._start_time = time.time()
        self._offset_x   = offset_x

    def _get_eye_params(self, time_offset: float):
        # Uses sine function to calculate oscillating height and corner radius
        elapsed = (time.time() - self._start_time) * ANIM_SPEED
        progress = (math.sin(elapsed + time_offset) + 1) / 2
        
        current_h = BASE_HEIGHT * (1 - (progress * SHRINK_PERCENT))
        current_r = BASE_RADIUS + (progress * RADIUS_INCREASE)
        
        return current_h, current_r

    def draw(self, screen: pygame.Surface):
        # Renders the eyes with alternating phase shifts to create a lively speech effect
        screen_w, screen_h = screen.get_size()
        
        h_left, r_left = self._get_eye_params(0)
        h_right, r_right = self._get_eye_params(math.pi)

        total_w = EYE_WIDTH * 2 + EYE_SPACING
        left_x  = (screen_w - total_w) // 2 + int(self._offset_x)
        right_x = left_x + EYE_WIDTH + EYE_SPACING
        
        pygame.draw.rect(screen, COLOR_EYE, 
                        (left_x, (screen_h - h_left)//2, EYE_WIDTH, int(h_left)), 
                        border_radius=int(r_left))
        
        pygame.draw.rect(screen, COLOR_EYE, 
                        (right_x, (screen_h - h_right)//2, EYE_WIDTH, int(h_right)), 
                        border_radius=int(r_right))
    
    @property
    def eye_h(self):
        # Exposes base height for engine compatibility
        return BASE_HEIGHT