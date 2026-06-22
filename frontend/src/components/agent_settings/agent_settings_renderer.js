let ipcRenderer = null;
try {
    ipcRenderer = require('electron').ipcRenderer;
} catch (e) {}

// ----------------------------------------------------------
//    AGENT SETTINGS — close button
//    Hides the window without destroying it
// ----------------------------------------------------------
const minimizeBtn  = document.getElementById('close_agent_settings_panel_btn_container')
minimizeBtn.addEventListener('click', () => {
    if (ipcRenderer) ipcRenderer.send('close-agent-settings')
})


// -----------------------------------------------------------------------------
//  VIEW NAVIGATION
// -----------------------------------------------------------------------------
const buttons = {
    agent_settings_general_btn:       'view_agent_general',
    agent_settings_entity_btn:        'view_agent_entity',
    agent_settings_account_btn:       'view_agent_account',
    agent_settings_notifications_btn: 'view_agent_notifications',
};


function selectTab(btnId) {
    document.querySelectorAll('.agent_settings_options > button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.agent_settings_view').forEach(v => v.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    document.getElementById(buttons[btnId]).classList.add('active');

    // Resize canvas now that the view is visible and has real dimensions
    if (window.resizeBgCanvas) window.resizeBgCanvas();
}

Object.keys(buttons).forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', () => selectTab(btnId));
});

// Default tab
selectTab('agent_settings_entity_btn');



// -----------------------------------------------------------------------------
//                                  BACKGROUND
// -----------------------------------------------------------------------------
const headerContainer = document.querySelector('.agent_settings_header');

// -------------- BACKGROUND INIT --------------
window.initGrainyBg({
    target: headerContainer,
    speed: 2.3,
    intensity: 0.112,
    grainSize: 1.9,
    amplitude: 0.1,
});

// Load the current background immediately when the window opens
if (ipcRenderer) {
    ipcRenderer.invoke('get-background').then((bg) => {
        const theme = (bg && bg.theme) ? bg.theme : window.DEFAULT_BG_THEME;
        const mode  = (bg && bg.mode)  ? bg.mode  : window.DEFAULT_BG_MODE;
        window.setBgColors(window.BG_THEMES[theme][mode]);
    });

    // LISTEN IN REAL TIME: If you change the theme in another window, this updates instantly
    ipcRenderer.on('background-changed', (event, data) => {
        if (data && data.colors) window.setBgColors(data.colors);
    });
}

// --- OPTIONS SCROLL EFECT ---
const scrollContainer = document.querySelector('.agent_settings_options');

let targetScrollLeft = scrollContainer.scrollLeft;
let isAnimating = false;

scrollContainer.addEventListener('wheel', (evt) => {
    evt.preventDefault();

    targetScrollLeft += evt.deltaY * 1.5; 

    let maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

    if (!isAnimating) { smoothUpdate(); }
});

function smoothUpdate() {
    isAnimating = true;
    let diff = targetScrollLeft - scrollContainer.scrollLeft;
    scrollContainer.scrollLeft += diff * 0.15;
    if (Math.abs(diff) > 0.5) { requestAnimationFrame(smoothUpdate); }
    else {
        scrollContainer.scrollLeft = targetScrollLeft;
        isAnimating = false;
    }
}


// -----------------------------------------------------------------------------
//  BEHAVIOR OPTIONS 
// -----------------------------------------------------------------------------
// Radio Type Selector Effect
const behaviorOptions = document.querySelectorAll('.behavior_option');

function selectBehavior(option) {
    behaviorOptions.forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
}

behaviorOptions.forEach(option => {
    option.addEventListener('click', () => selectBehavior(option));
});



// -----------------------------------------------------------------------------
//  SPHERE LOGIC 
// -----------------------------------------------------------------------------
// On Agent Settings style
const spherePreviewContainer = document.getElementById('agent_sphere_preview')
let sphereInstance = window.createRingsSphere(spherePreviewContainer)

//------------ RENDER SPHERE SELECTOR & LOGIC -------------
const sphereSelectorContainer = document.getElementById('sphere_selector')
let currentSphere = window.DEFAULT_SPHERE

Object.entries(window.SPHERE_THEMES).forEach(([key, theme]) => {
    const card = document.createElement('div')
    card.classList.add('sphere_card')
    card.style.backgroundImage = `url(${theme.thumbnail})`
    card.dataset.sphere = key
    card.title = theme.label

    if (key === currentSphere) card.classList.add('selected')

    card.addEventListener('click', () => {
        currentSphere = key

        // Destruye la esfera previa y crea la nueva en el preview
        if (sphereInstance) {sphereInstance.destroy() }
        sphereInstance = theme.create(spherePreviewContainer)

        document.querySelectorAll('.sphere_card').forEach(c => c.classList.remove('selected'))
        card.classList.add('selected')

        if (ipcRenderer) {
            ipcRenderer.send('sphere-changed', { sphere: currentSphere })
        }
    })

    sphereSelectorContainer.appendChild(card)
})



