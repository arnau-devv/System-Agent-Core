import time
import random
import pygame

# --- Eye geometry ---
# Sets the fixed width and default height for the eye rectangles
EYE_WIDTH         = 120
EYE_HEIGHT_IDLE   = 85    
# Defines the distance between the two eyes to ensure symmetrical spacing
EYE_SPACING       = 40
# Controls the roundness of the eye corners
BORDER_RADIUS     = 15

# --- Colors ---
# Cyan color used for rendering the eyes
COLOR_EYE         = (0, 220, 220)

# --- Blink ---
# Configuration for the automatic blinking frequency and duration
BLINK_INTERVAL    = 4.0
BLINK_SPEED       = 0.18
BLINK_MIN_HEIGHT  = 10

# --- Gaze movement ---
# Time delay between gaze shifts (in seconds)
LOOK_INTERVAL     = 7.0   
# X-axis distance for the eye movement
LOOK_OFFSET_X     = 45    
# Smoothing factor for gaze movement
LOOK_SPEED        = 0.10
# Time to hold the gaze in a specific direction before returning to center
LOOK_HOLD_TIME    = 2
# Scaling factor to adjust eye height during a gaze shift
LOOK_HEIGHT_SCALE = 0.85 

class IdleAnimation:
    def __init__(self):
        # Initializes current and target state variables for smooth transitions
        self._eye_h             = EYE_HEIGHT_IDLE
        self._eye_h_target      = EYE_HEIGHT_IDLE
        
        self._offset_x          = 0.0
        self._offset_x_target   = 0.0
        self._offset_y          = 0.0
        
        # Internal timers and flags to track animation states
        self._last_blink        = time.time()
        self._last_look         = time.time()
        self._look_hold_until   = 0.0
        self._is_looking        = False 
        self._blinking          = False
        self._blink_interval    = random.uniform(1, 6)
        self._blink_block_until = 0.0

    def start_from(self, eye_h: float, offset_x: float):
        # Initializes state variables based on parameters from a previous animation
        self._eye_h = eye_h
        self._offset_x = offset_x
        self._offset_y = 0.0
        self._eye_h_target = EYE_HEIGHT_IDLE
        self._offset_x_target = 0.0
        self._is_looking = False

    def draw(self, screen: pygame.Surface):
        # Updates animation logic based on current system time
        now = time.time()
        
        self._update_look(now)
        self._update_blink(now) 

        # Determines target height based on current animation state priority
        if self._blinking:
            pass 
        elif self._is_looking and now < self._look_hold_until:
            # Adjusts height for a focused look appearance
            self._eye_h_target = EYE_HEIGHT_IDLE * LOOK_HEIGHT_SCALE
        else:
            self._eye_h_target = EYE_HEIGHT_IDLE

        # Performs linear interpolation (Lerp) to reach target values smoothly
        self._eye_h    += (self._eye_h_target - self._eye_h) * BLINK_SPEED
        self._offset_x += (self._offset_x_target - self._offset_x) * LOOK_SPEED
        # Force the Y offset to 0 to keep the eyes vertically centered
        self._offset_y += (0.0 - self._offset_y) * LOOK_SPEED 

        self._draw_eyes(screen, *screen.get_size())

    def _update_blink(self, now: float):
        # Prevents blinking if the eyes are currently focused on a gaze point
        if self._is_looking or now < self._blink_block_until:
            return

        # Triggers blink if interval has elapsed
        if not self._blinking and now - self._last_blink >= BLINK_INTERVAL:
            self._blinking       = True
            self._eye_h_target   = BLINK_MIN_HEIGHT
            self._last_blink     = now
        # Reset blink state when the eye closes/opens fully
        elif self._blinking and self._eye_h <= BLINK_MIN_HEIGHT + 1.5:
            self._blink_interval = random.uniform(1, 6) 
            self._blinking     = False

    def _update_look(self, now: float):
        # 1. Initiates the gaze shift to a random horizontal position
        if not self._is_looking and now - self._last_look >= LOOK_INTERVAL:
            self._offset_x_target = random.choice([-1, 1]) * LOOK_OFFSET_X
            self._look_hold_until = now + LOOK_HOLD_TIME
            self._is_looking = True
            
        # 2. Returns the eyes to the center position after hold time expires
        elif self._is_looking and now >= self._look_hold_until:
            self._offset_x_target = 0.0
            
            # Reset gaze state only when the eye return is complete
            if abs(self._offset_x) < 0.5:
                # Add a buffer time before resuming standard blinking
                self._blink_block_until = now + 2.0
                self._is_looking = False
                self._last_look = now

    def _draw_eyes(self, screen, screen_w, screen_h):
        # Calculates horizontal and vertical layout for eye rectangles
        total_w = EYE_WIDTH * 2 + EYE_SPACING
        left_x  = (screen_w - total_w) // 2 + int(self._offset_x)
        right_x = left_x + EYE_WIDTH + EYE_SPACING
        eye_y   = (screen_h - int(self._eye_h)) // 2
        
        # Renders the rectangles using the calculated coordinates and current height
        pygame.draw.rect(screen, COLOR_EYE, (left_x, eye_y, EYE_WIDTH, int(self._eye_h)), border_radius=BORDER_RADIUS)
        pygame.draw.rect(screen, COLOR_EYE, (right_x, eye_y, EYE_WIDTH, int(self._eye_h)), border_radius=BORDER_RADIUS)