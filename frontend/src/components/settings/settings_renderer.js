// Electron IPC (solo disponible en Electron, no en browser)
let ipcRenderer = null;
try {
    ipcRenderer = require('electron').ipcRenderer;
} catch (e) {
    // Estamos en un navegador normal (Live Server), ipcRenderer no disponible
}

// ------ Close Settings --------
const minimizeBtn = document.getElementById('close_settings_panel_btn_container');
minimizeBtn.addEventListener('click', () => {
    if (ipcRenderer) ipcRenderer.send('close-settings');
});



// ====================================================================
//                            CUSTOMIZATION
// ====================================================================

// ---------------------------- BACKDOUNDS ----------------------------

const BG_THEMES = window.BG_THEMES

// ---------- BACKGORUND COLORS SELECTOR RENDERER - updater ----------
let currentTheme = window.DEFAULT_BG_THEME
let currentMode  = window.DEFAULT_BG_MODE; // "normal" | "dark"

const header = document.querySelector('.bacgorund_previsualizer_header p');
header.textContent = currentTheme
const bgPrevsualizer = document.getElementById('background_previsualizer')
const selectorContainer = document.getElementById('background_selector');

window.initGrainyBg({
    target: document.getElementById('background_previsualizer'),
});

function applyTheme() {
    let colors = BG_THEMES[currentTheme][currentMode];
    window.setBgColors(colors);
    if (header) header.textContent = currentTheme;
}

// Preguntamos a main.js cuál es el tema actual real, en vez de asumir uno fijo
ipcRenderer.invoke('get-background').then((bg) => {
    console.log('DEBUG get-background devolvió:', JSON.stringify(bg))
    if (bg && bg.theme && BG_THEMES[bg.theme]) {
        currentTheme = bg.theme
    }
    applyTheme()

    // Marcar visualmente la card correcta como seleccionada
    document.querySelectorAll('.theme_card').forEach(c => {
        c.classList.toggle('selected', c.dataset.theme === currentTheme)
    })
})

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

        ipcRenderer.send('background-changed', { 
            colors: BG_THEMES[currentTheme][currentMode]
        });
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
