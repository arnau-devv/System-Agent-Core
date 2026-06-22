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



// ====================================================================
//                            CUSTOMIZATION
// ====================================================================

// ---------------------------- BACKDOUNDS ----------------------------

const BG_THEMES = window.BG_THEMES

// ---------- BACKGORUND COLORS SELECTOR RENDERER - updater ----------
let currentTheme = window.DEFAULT_BG_THEME
let currentMode  = window.DEFAULT_BG_MODE; // "normal" | "dark"

const header = document.querySelector('.backgorund_previsualizer_header p');
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
if (ipcRenderer) {
    ipcRenderer.invoke('get-background').then((bg) => {
        console.log('DEBUG get-background devolvió:', JSON.stringify(bg))
        if (bg && bg.theme && BG_THEMES[bg.theme]) {
            currentTheme = bg.theme
        }
        if (bg && bg.mode) {
            currentMode = bg.mode
        }
        applyTheme()

        // Ahora sí sincroniza el toggle con el modo real
        currentToggleColors = BG_THEMES[currentTheme].normal
        colorModeToggleInput.checked = (currentMode === 'dark')
        updateToggleBackground()
        updateModeLabel()

        // Marcar visualmente la card correcta como seleccionada
        document.querySelectorAll('.theme_card').forEach(c => {
            c.classList.toggle('selected', c.dataset.theme === currentTheme)
        })
    })

}
// -------- BACKGROUND MODE Normal/dark -------------
const colorModeToggleInput = document.getElementById('color_mode_toggle_input');
const colorToggleSwitch = document.getElementById('color_toggle_switch');
const colorModeTrack = document.getElementById('background_mode_track');
let currentToggleColors = BG_THEMES[currentTheme].normal;

function updateToggleBackground() {
    const toggleSlider = colorToggleSwitch.querySelector('.toggle_slider');
    toggleSlider.style.background = colorModeToggleInput.checked
        ? `linear-gradient(135deg, ${currentToggleColors[1]}, ${currentToggleColors[3]})`
        : `rgba(43, 27, 61, 0.35)`;
}

function updateModeLabel() {
    // Pure state -> class mapping, no timers involved, so there's nothing to desync
    colorModeTrack.classList.toggle('show_dark', currentMode === 'dark');
}


colorModeToggleInput.addEventListener('change', (event) => {
    currentMode = event.target.checked ? 'dark' : 'normal';
    updateToggleBackground();
    updateModeLabel();
    applyTheme();
    if (ipcRenderer) {
        ipcRenderer.send('background-changed', {
            theme:  currentTheme,
            mode:   currentMode,
            colors: window.BG_THEMES[currentTheme][currentMode]
        });
    }
});

//------------ RENDER COLOR SELECTOR & LOGIC -------------

// 1. Crear un contenedor temporal y oculto de 50x50 para generar los snapshots
const tempTarget = document.createElement('div');
tempTarget.style.cssText = 'width: 50px; height: 50px; position: absolute; visibility: hidden; pointer-events: none; z-index: -9999;';
document.body.appendChild(tempTarget);

// 2. Inicializar el generador de fondos en modo estático
const snapshotGenerator = window.initGrainyBg({
    target: tempTarget,
    animate: false,               
    preserveDrawingBuffer: true,  
    isSnapshot: true,
    grainSize: 1.0,               
});

Object.entries(BG_THEMES).forEach(([name, theme], index) => {
    const card = document.createElement('div');
    card.classList.add('theme_card');
    card.dataset.theme = name;
    card.title = name;

    // 3. Generar el snapshot y aplicarlo
    if (snapshotGenerator) { //If only for debug
        snapshotGenerator.setColors(theme.normal);
        // Desfasamos el renderizado de cada tarjeta para que el grano y las curvas no sean idénticas
        snapshotGenerator.drawFrame(1000 + (index * 800));
        
        const snapshotUrl = snapshotGenerator.canvas.toDataURL('image/jpeg', 0.9);
        card.style.backgroundImage = `url(${snapshotUrl})`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
    } else {
        card.style.background = `linear-gradient(135deg, ${theme.normal[1]}, ${theme.normal[3]})`;
    }

    if (name === currentTheme) card.classList.add('selected');

    card.addEventListener('click', () => {
        currentTheme = name;
        currentToggleColors = BG_THEMES[name].normal;
        applyTheme();
        updateToggleBackground();
        document.querySelectorAll('.theme_card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (ipcRenderer) {
            ipcRenderer.send('background-changed', {
                theme:  currentTheme,
                mode:   currentMode,
                colors: BG_THEMES[currentTheme][currentMode]
            });
        }
    });

    selectorContainer.appendChild(card);
});

// 4. Limpiar el generador de la memoria
if (snapshotGenerator) snapshotGenerator.destroy();
tempTarget.remove();


// [!!!] Render without icon grainy snapshot ->
// [!!!] Change isSnapshot from griny-bg to redo this
// //------------ RENDER COLOR SELECTOR & LOGIC -------------
// Object.entries(BG_THEMES).forEach(([name, theme]) => {
//     const card = document.createElement('div');
//     card.classList.add('theme_card');
//     card.style.background = `linear-gradient(135deg, ${theme.normal[0]}, ${theme.normal[2]})`;
//     card.dataset.theme = name;
//     card.title = name;

//     if (name === currentTheme) card.classList.add('selected');

//     card.addEventListener('click', () => {
//         currentTheme = name;
//         currentToggleColors = BG_THEMES[name].normal;
//         applyTheme();
//         updateToggleBackground();
//         document.querySelectorAll('.theme_card').forEach(c => c.classList.remove('selected'));
//         card.classList.add('selected');

//         if (ipcRenderer) {
//             ipcRenderer.send('background-changed', {
//                 theme:  currentTheme,
//                 mode:   currentMode,
//                 colors: BG_THEMES[currentTheme][currentMode]
//             });
//         }
//     });

//     selectorContainer.appendChild(card);
// });





