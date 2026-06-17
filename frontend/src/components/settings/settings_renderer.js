// Electron IPC (solo disponible en Electron, no en browser)
let ipcRenderer = null;
try {
    ipcRenderer = require('electron').ipcRenderer;
} catch (e) {
    // Estamos en un navegador normal (Live Server), ipcRenderer no disponible
}

// ------ Close Settings --------
const minimizeBtn = document.getElementById('close_settings_panel_btn');
minimizeBtn.addEventListener('click', () => {
    if (ipcRenderer) ipcRenderer.send('close-settings');
});



// ====================================================================
//                            CUSTOMIZATION
// ====================================================================

// ---------------------------- BACKDOUNDS ----------------------------

const BG_THEMES = {
    "Original Bright": {
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
};

// ---------- BACKGORUND COLORS SELECTOR RENDERER - updater ----------
let currentTheme = "Midnight Ocean";
let currentMode  = "normal"; // "normal" | "dark"

const header = document.querySelector('.bacgorund_previsualizer_header p');
const bgPrevsualizer = document.getElementById('background_previsualizer')
const selectorContainer = document.getElementById('background_selector');

function applyTheme() {
    let colors = BG_THEMES[currentTheme][currentMode];
    window.setBgColors(colors);
    if (header) header.textContent = currentTheme;
}

Object.entries(BG_THEMES).forEach(([name, theme]) => {
    const card = document.createElement('div');
    card.classList.add('theme_card');
    card.style.background = `linear-gradient(135deg, ${theme.normal[0]}, ${theme.normal[2]})`;
    card.dataset.theme = name;
    card.title = name;

    if (name === currentTheme) card.classList.add('selected');

    card.addEventListener('click', () => {
        currentTheme = name;
        applyTheme();
        document.querySelectorAll('.theme_card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
    });

    selectorContainer.appendChild(card);
});








// ================================================================
//  VIEW NAVIGATION
// ================================================================
const buttons = {
    general_settings_btn:       'view_general',
    customization_settings_btn: 'view_customization',
    account_settings_btn:       'view_account',
    notifications_settings_btn: 'view_notifications',
};

function selectTab(btnId) {
    document.querySelectorAll('.settings_panel_options > button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings_view').forEach(v => v.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    document.getElementById(buttons[btnId]).classList.add('active');

    // Resize canvas now that the view is visible and has real dimensions
    if (window.resizeBgCanvas) window.resizeBgCanvas();
}

Object.keys(buttons).forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', () => selectTab(btnId));
});

// Default tab
selectTab('customization_settings_btn');
// Apply initial theme (after grainy_bg has created window.setBgColors)
applyTheme();