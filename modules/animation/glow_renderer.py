import pygame

# --- Glow configuration parameters ---
COLOR_BG = (10, 14, 22)             # Consistent background theme
GLOW_COLOR        = (0, 220, 220)   # Cyan glow hue
GLOW_ALPHA_BASE   = 25              # Outer glow transparency
GLOW_RADIUS_EXP   = 4               # Diffusion factor

class GlowRenderer:
    # Post-processing decorator. 
    # It renders sharp shapes to a buffer, then creates a diffusive glow
    # effect by compositing scaled, transparent layers.
    def __init__(self, screen_size: tuple):
        self._screen_size = screen_size
        
        # Buffer for glow processing
        self._temp_surf = pygame.Surface(screen_size, pygame.SRCALPHA)
        # Buffer for the sharp, high-definition eye core
        self._solid_surf = pygame.Surface(screen_size, pygame.SRCALPHA)

    def render(self, target_screen: pygame.Surface, draw_callback):
        # Reset buffers for the current frame
        self._temp_surf.fill((0, 0, 0, 0))
        self._solid_surf.fill((0, 0, 0, 0))
        
        # Execute the animation callback to draw onto the high-definition solid buffer
        draw_callback(self._solid_surf)
        
        # Clear target screen with the global background color
        target_screen.fill(COLOR_BG)

        # --- GLOW COMPOSITION ---
        # Draw multiple layers of blurred glowing shapes behind the solid core
        for i in range(3, 0, -1):
            alpha = int(GLOW_ALPHA_BASE / i)
            scale = 1.0 + (i * 0.02 * GLOW_RADIUS_EXP)
            
            glow_surf = self._create_glow_layer(self._solid_surf, GLOW_COLOR, alpha, scale)
            
            # Position glow layer centrally
            rect = glow_surf.get_rect(center=(self._screen_size[0]//2, self._screen_size[1]//2))
            target_screen.blit(glow_surf, rect)

        # Composite the sharp solid eyes on top of the glowing aura
        target_screen.blit(self._solid_surf, (0, 0))

    def _create_glow_layer(self, source_surf: pygame.Surface, color, alpha, scale):
        # Creates a blurred glow layer using a downscale/upscale technique.
        # This provides a software-side Gaussian blur without external dependencies.
        w, h = source_surf.get_size()
        
        # Tint the current buffer with the glow color
        surf = source_surf.copy()
        var_color = pygame.Surface(surf.get_size(), pygame.SRCALPHA)
        var_color.fill((*color, alpha))
        surf.blit(var_color, (0, 0), special_flags=pygame.BLEND_RGBA_MULT)
        
        # Downscale to pixelate/blur the buffer
        downscale_w = int(w / 4)
        downscale_h = int(h / 4)
        if downscale_w > 1 and downscale_h > 1:
            surf = pygame.transform.smoothscale(surf, (downscale_w, downscale_h))
        
        # Upscale to the target glow expansion size
        final_w = int(w * scale)
        final_h = int(h * scale)
        surf = pygame.transform.smoothscale(surf, (final_w, final_h))
        
        return surf