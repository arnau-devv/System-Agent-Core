// ipcRenderer is only available inside Electron.
// The try/catch lets this file load in a plain browser (e.g. Live Server) without crashing.
let ipcRenderer = null
try { ipcRenderer = require('electron').ipcRenderer } catch (e) {}


// =============================================================================
//  HEADER
// =============================================================================
document.getElementById('close_agent_settings_panel_btn_container').addEventListener('click', () => {
    if (ipcRenderer) ipcRenderer.send('close-agent-settings')
})


// =============================================================================
//  VIEW NAVIGATION
//  Maps each sidebar button ID to the view panel ID it should reveal.
// =============================================================================
const buttons = {
    agent_settings_general_btn:       'view_agent_general',
    agent_settings_entity_btn:        'view_agent_entity',
    agent_settings_account_btn:       'view_agent_account',
    agent_settings_notifications_btn: 'view_agent_notifications',
}

function selectTab(btnId) {
    document.querySelectorAll('.agent_settings_options > button').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.agent_settings_view').forEach(v => v.classList.remove('active'))
    document.getElementById(btnId).classList.add('active')
    document.getElementById(buttons[btnId]).classList.add('active')

    // Canvas may have been sized while hidden (0x0) — resize now that the view is visible
    if (window.resizeBgCanvas) window.resizeBgCanvas()
}

Object.keys(buttons).forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', () => selectTab(btnId))
})

selectTab('agent_settings_entity_btn')


// =============================================================================
//  BACKGROUND
//  The header uses its own grainy-bg instance (not fullscreen).
//  It syncs with the global theme on load and in real time via IPC.
// =============================================================================
window.initGrainyBg({
    target:    document.querySelector('.agent_settings_header'),
    speed:     2.3,
    intensity: 0.112,
    grainSize: 1.9,
    amplitude: 0.1,
})

if (ipcRenderer) {
    // Apply the persisted theme on open
    ipcRenderer.invoke('get-background').then((bg) => {
        const theme  = bg?.theme ?? window.DEFAULT_BG_THEME
        const mode   = bg?.mode  ?? window.DEFAULT_BG_MODE
        window.setBgColors(window.BG_THEMES[theme][mode])
    })

    // Keep in sync when the user changes theme in the settings window
    ipcRenderer.on('background-changed', (event, data) => {
        if (data?.colors) window.setBgColors(data.colors)
    })
}


// =============================================================================
//  OPTIONS SCROLL
//  Converts vertical wheel events into smooth horizontal scrolling for the
//  options bar (which overflows horizontally on small window sizes).
// =============================================================================
const scrollContainer = document.querySelector('.agent_settings_options')
let targetScrollLeft = scrollContainer.scrollLeft
let isAnimating      = false

scrollContainer.addEventListener('wheel', (evt) => {
    evt.preventDefault()
    targetScrollLeft += evt.deltaY * 1.5
    targetScrollLeft  = Math.max(0, Math.min(targetScrollLeft, scrollContainer.scrollWidth - scrollContainer.clientWidth))
    if (!isAnimating) smoothScroll()
})

function smoothScroll() {
    isAnimating = true
    const diff  = targetScrollLeft - scrollContainer.scrollLeft
    scrollContainer.scrollLeft += diff * 0.15
    if (Math.abs(diff) > 0.5) { requestAnimationFrame(smoothScroll) }
    else { scrollContainer.scrollLeft = targetScrollLeft; isAnimating = false }
}


// =============================================================================
//  BEHAVIOR OPTIONS
//  Radio-style selector — only one option can be active at a time.
// =============================================================================
const behaviorOptions = document.querySelectorAll('.behavior_option')

function selectBehavior(option) {
    behaviorOptions.forEach(o => o.classList.remove('selected'))
    option.classList.add('selected')
}

behaviorOptions.forEach(opt => opt.addEventListener('click', () => selectBehavior(opt)))


// =============================================================================
//  SPHERE SELECTOR
//  Cards are built first, then the persisted sphere is loaded asynchronously
//  so the correct card gets marked and the preview renders the right sphere.
//  Building cards before the invoke avoids a flash of "no selection".
// =============================================================================
const spherePreviewContainer  = document.getElementById('agent_sphere_preview')
const sphereSelectorContainer = document.getElementById('sphere_selector')
let   sphereInstance          = null
let   currentSphere           = window.DEFAULT_SPHERE

// ----------- Build cards -----------
Object.entries(window.SPHERE_THEMES).forEach(([key, theme]) => {
    const card = document.createElement('div')
    card.classList.add('sphere_card')
    card.style.backgroundImage = `url(${theme.thumbnail})`
    card.dataset.sphere = key
    card.title = theme.label

    card.addEventListener('click', () => {
        currentSphere = key

        // Swap the preview sphere
        if (sphereInstance) sphereInstance.destroy()
        sphereInstance = theme.create(spherePreviewContainer)

        // Update selection UI
        document.querySelectorAll('.sphere_card').forEach(c => c.classList.remove('selected'))
        card.classList.add('selected')

        // Persist and broadcast to main window
        if (ipcRenderer) ipcRenderer.send('sphere-changed', { sphere: currentSphere })
    })

    sphereSelectorContainer.appendChild(card)
})

// ----------- Apply persisted sphere -----------
// Done after cards are in the DOM so querySelector can find the right card
if (ipcRenderer) {
    ipcRenderer.invoke('get-sphere').then((saved) => {
        currentSphere = saved || window.DEFAULT_SPHERE

        // Mark the correct card
        sphereSelectorContainer.querySelectorAll('.sphere_card').forEach(c => {
            c.classList.toggle('selected', c.dataset.sphere === currentSphere)
        })

        // Render the preview
        const theme = window.SPHERE_THEMES[currentSphere]
        if (theme) sphereInstance = theme.create(spherePreviewContainer)
    })
}