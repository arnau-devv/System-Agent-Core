// ============================================================
//  BG_THEMES — diccionario único de temas de fondo
//  Cargado por index.html, chat.html y settings.html.
//  Si querés cambiar un color o agregar un tema, se hace SOLO acá.
// ============================================================

window.BG_THEMES = {
    "Cosmic Sunset": {
        normal: ["#5b0bb5", "#7c3aed", "#fb923c", "#db2777"],
        dark:   ["#1a0336", "#2a0f6b", "#7a3a0a", "#5a0a2e"],
    },
    "Midnight Ocean": {
        normal: ["#0a0a2e", "#1a1a5e", "#0d3b6e", "#1a6b8a"],
        dark:   ["#020408", "#060d1f", "#0a1628", "#0f2040"],
    },
    "Aurora": {
        normal: ["#0d1b2a", "#1b4332", "#00b4d8", "#7b2d8b"],
        dark:   ["#020a0d", "#041520", "#06202e", "#1f0b2e"],
    },
    "Ember": {
        normal: ["#1a0000", "#7f1d1d", "#c2410c", "#b45309"],
        dark:   ["#0a0200", "#1a0500", "#2d0d00", "#3d1500"],
    },
    "Neon Noir": {
        normal: ["#0f0020", "#3b0764", "#db2777", "#f97316"],
        dark:   ["#050508", "#0f0a1a", "#1a0a2e", "#2d1054"],
    },
    "Deep Forest": {
        normal: ["#052e16", "#14532d", "#1e3a2f", "#065f46"],
        dark:   ["#010a04", "#041a0a", "#062e12", "#0a3d18"],
    },
    "Dusk": {
        normal: ["#1c1017", "#7c2d42", "#c084fc", "#fdba74"],
        dark:   ["#080508", "#150a12", "#22101e", "#2e0f22"],
    },
    "Monochrome Blue": {
        normal: ["#0c1445", "#1e3a8a", "#2563eb", "#93c5fd"],
        dark:   ["#080810", "#10101a", "#181825", "#1e1e2e"],
    },
    "Solar Flare": {
        normal: ["#7a1500", "#c2410c", "#f59e0b", "#fde047"],
        dark:   ["#1f0500", "#330a00", "#4d1400", "#5c2400"],
    },
    "Cyberpunk Neon": {
        normal: ["#0a0014", "#ff00aa", "#00f0ff", "#7b2ff7"],
        dark:   ["#03000a", "#1a0010", "#001a1f", "#160a33"],
    },
    "Sakura Dream": {
        normal: ["#2d1b2e", "#a8597a", "#f4a6c1", "#ffd6e8"],
        dark:   ["#100a10", "#240f1c", "#3a1626", "#4a1c30"],
    },
    "Arctic Frost": {
        normal: ["#0b1d26", "#1c4966", "#5fa8d3", "#cdeefe"],
        dark:   ["#020608", "#04101a", "#081d2e", "#0c2b3f"],
    },
    "Desert Mirage": {
        normal: ["#3b1f12", "#a85c32", "#e0a458", "#f4d35e"],
        dark:   ["#100a06", "#1f1208", "#2e1a0a", "#3d220c"],
    },
    "Tropical Lagoon": {
        normal: ["#013a40", "#00897b", "#26c6da", "#ff7e67"],
        dark:   ["#00100f", "#011f1f", "#022e2e", "#06383f"],
    },
    "Royal Velvet": {
        normal: ["#1a0b2e", "#4a148c", "#9c27b0", "#d4af37"],
        dark:   ["#070314", "#100726", "#1c0a3a", "#241050"],
    },
    "Toxic Waste": {
        normal: ["#0a1a00", "#3f6212", "#84cc16", "#d9f99d"],
        dark:   ["#020600", "#0a1500", "#152600", "#1e3300"],
    },
    "Cotton Candy": {
        normal: ["#2b1b3d", "#ff6fb5", "#7ec8e3", "#fff3b0"],
        dark:   ["#0d0815", "#1c0f26", "#2a1430", "#331b3a"],
    },
    "Volcanic Ash": {
        normal: ["#0d0d0d", "#3d3d3d", "#8b0000", "#ff4500"],
        dark:   ["#000000", "#0a0a0a", "#1a0500", "#2e0a00"],
    },
    "Galaxy Dust": {
        normal: ["#03001c", "#240046", "#5a189a", "#e0aaff"],
        dark:   ["#010008", "#06000f", "#0d0020", "#160033"],
    },
    "Citrus Burst": {
        normal: ["#2e3d00", "#7a9a01", "#bedb39", "#fff200"],
        dark:   ["#0a0d00", "#141a00", "#1f2900", "#2a3800"],
    },
};

// Tema usado por defecto si nadie ha elegido nada todavía (primer arranque de la app)
window.DEFAULT_BG_THEME = "Cosmic Sunset";
window.DEFAULT_BG_MODE  = "dark";