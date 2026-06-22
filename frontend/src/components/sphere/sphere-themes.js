// ============================================================
//  SPHERE_THEMES — diccionario único de spheres disponibles
//  Cargado por index.html y agent_settings.html, DESPUÉS de three.min.js
//  y de cada sphere-*.js (que solo definen la función, no se autoejecutan).
//
//  Cada entrada:
//    label     -> nombre visible en el selector
//    thumbnail -> ruta a la miniatura estática (PNG/SVG) usada en las cards
//    create    -> fábrica: create(container) -> { setState(state), destroy() }
// ============================================================

window.SPHERE_THEMES = {
    "ion": {
        label: "Ion",
        thumbnail: "../../../assets/images/spheres/rings.png",
        create: (container) => typeof createIonSphere !== 'undefined' ? createIonSphere(container) : null,
    },

    "rings": {
        label: "Rings",
        thumbnail: "../../../assets/images/spheres/rings.png",
        create: (container) => typeof createRingsSphere !== 'undefined' ? createRingsSphere(container) : null,
    }
}

// Sphere usado por defecto si nadie ha elegido nada todavía (primer arranque)
window.DEFAULT_SPHERE = "rings"