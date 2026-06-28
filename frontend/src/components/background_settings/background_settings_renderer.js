// ipcRenderer is only available inside Electron.
// The try/catch lets this file load in a plain browser (e.g. Live Server) without crashing.
let ipcRenderer = null
try { ipcRenderer = require('electron').ipcRenderer } catch (e) {}


// =============================================================================
//  HEADER
// =============================================================================
document.getElementById('close_settings_panel_btn_container').addEventListener('click', () => {
    if (ipcRenderer) ipcRenderer.send('close-settings')
})


// =============================================================================
//  BACKGROUND CUSTOMIZATION
// =============================================================================
const BG_THEMES = window.BG_THEMES

// Working state — updated by the theme cards and the mode toggle
let currentTheme = window.DEFAULT_BG_THEME
let currentMode  = window.DEFAULT_BG_MODE   // 'normal' | 'dark'

// ----------- Previewer -----------
const header        = document.querySelector('.backgorund_previsualizer_header p')
const selectorContainer = document.getElementById('background_selector')

header.textContent = currentTheme

// The previewer runs its own grainy-bg instance, separate from the fullscreen one
window.initGrainyBg({ target: document.getElementById('background_previsualizer') })

function applyTheme() {
    window.setBgColors(BG_THEMES[currentTheme][currentMode])
    header.textContent = currentTheme
}

// ----------- Sync with persisted config -----------
// Load the real saved theme/mode instead of always starting with the defaults
if (ipcRenderer) {
    ipcRenderer.invoke('get-background').then((bg) => {
        if (bg?.theme && BG_THEMES[bg.theme]) currentTheme = bg.theme
        if (bg?.mode)                         currentMode  = bg.mode

        applyTheme()

        // Sync the mode toggle visuals with the loaded state
        currentToggleColors          = BG_THEMES[currentTheme].normal
        colorModeToggleInput.checked = (currentMode === 'dark')
        updateToggleBackground()
        updateModeLabel()

        // Mark the correct theme card as selected
        document.querySelectorAll('.theme_card').forEach(c => {
            c.classList.toggle('selected', c.dataset.theme === currentTheme)
        })
    })
}


// =============================================================================
//  BACKGROUND MODE TOGGLE  (normal / dark)
// =============================================================================
const colorModeToggleInput = document.getElementById('color_mode_toggle_input')
const colorToggleSwitch    = document.getElementById('color_toggle_switch')
const colorModeTrack       = document.getElementById('background_mode_track')

// Colors used to tint the toggle slider — updated whenever the theme changes
let currentToggleColors = BG_THEMES[currentTheme].normal

function updateToggleBackground() {
    const slider = colorToggleSwitch.querySelector('.toggle_slider')
    slider.style.background = colorModeToggleInput.checked
        ? `linear-gradient(135deg, ${currentToggleColors[1]}, ${currentToggleColors[3]})`
        : 'rgba(43, 27, 61, 0.35)'
}

function updateModeLabel() {
    colorModeTrack.classList.toggle('show_dark', currentMode === 'dark')
}

colorModeToggleInput.addEventListener('change', (e) => {
    currentMode = e.target.checked ? 'dark' : 'normal'
    updateToggleBackground()
    updateModeLabel()
    applyTheme()
    if (ipcRenderer) {
        ipcRenderer.send('background-changed', {
            theme:  currentTheme,
            mode:   currentMode,
            colors: BG_THEMES[currentTheme][currentMode]
        })
    }
})


// =============================================================================
//  THEME CARD SELECTOR
//  Each card shows a static snapshot of its gradient rendered by grainy-bg.
//  We use a temporary off-screen canvas to generate the snapshots, then
//  destroy it — it doesn't need to stay alive after the cards are built.
// =============================================================================

// -- Off-screen snapshot generator --
const tempTarget = document.createElement('div')
tempTarget.style.cssText = 'width:50px;height:50px;position:absolute;visibility:hidden;pointer-events:none;z-index:-9999;'
document.body.appendChild(tempTarget)

const snapshotGenerator = window.initGrainyBg({
    target: tempTarget,
    animate: false,
    preserveDrawingBuffer: true,
    isSnapshot: true,
    grainSize: 1.0,
})

// -- Build cards --
Object.entries(BG_THEMES).forEach(([name, theme], index) => {
    const card = document.createElement('div')
    card.classList.add('theme_card')
    card.dataset.theme = name
    card.title = name

    if (snapshotGenerator) {
        snapshotGenerator.setColors(theme.normal)
        // Offset each frame so cards don't all look identical
        snapshotGenerator.drawFrame(1000 + index * 800)
        const url = snapshotGenerator.canvas.toDataURL('image/jpeg', 0.9)
        card.style.backgroundImage    = `url(${url})`
        card.style.backgroundSize     = 'cover'
        card.style.backgroundPosition = 'center'
    } else {
        // Fallback for non-Electron / no-canvas environments
        card.style.background = `linear-gradient(135deg, ${theme.normal[1]}, ${theme.normal[3]})`
    }

    // Cards are built before the config loads — the invoke below marks the correct one
    card.addEventListener('click', () => {
        currentTheme        = name
        currentToggleColors = BG_THEMES[name].normal
        applyTheme()
        updateToggleBackground()
        document.querySelectorAll('.theme_card').forEach(c => c.classList.remove('selected'))
        card.classList.add('selected')
        if (ipcRenderer) {
            ipcRenderer.send('background-changed', {
                theme:  currentTheme,
                mode:   currentMode,
                colors: BG_THEMES[currentTheme][currentMode]
            })
        }
    })

    selectorContainer.appendChild(card)
})

// -- Clean up the off-screen generator --
if (snapshotGenerator) snapshotGenerator.destroy()
tempTarget.remove()