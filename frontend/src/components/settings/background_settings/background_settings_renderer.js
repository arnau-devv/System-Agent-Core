// =============================================================================
//  BACKGROUND SETTINGS — background_settings/background_settings_renderer.js
//  Toda la lógica del selector de temas y el toggle normal/dark.
//  Depende de: ipcRenderer (declarado en settings_renderer.js), BG_THEMES,
//              initGrainyBg (cargados antes en settings.html).
// =============================================================================

const BG_THEMES = window.BG_THEMES

// Working state — updated by the theme cards and the mode toggle
let currentTheme = window.DEFAULT_BG_THEME
let currentMode  = window.DEFAULT_BG_MODE   // 'normal' | 'dark'

// ── Previewer instance ────────────────────────────────────────────────────────
const previewHeader      = document.querySelector('.backgorund_previsualizer_header p')
const selectorContainer  = document.getElementById('background_selector')

previewHeader.textContent = currentTheme

const previewInstance = window.initGrainyBg({
    target: document.getElementById('background_previsualizer')
})

function applyTheme() {
    previewInstance.setColors(BG_THEMES[currentTheme][currentMode])
    previewHeader.textContent = currentTheme
}

// ── Sync with persisted config ────────────────────────────────────────────────
if (ipcRenderer) {
    ipcRenderer.invoke('get-background').then((bg) => {
        if (bg?.theme && BG_THEMES[bg.theme]) currentTheme = bg.theme
        if (bg?.mode)                         currentMode  = bg.mode

        applyTheme()

        currentToggleColors          = BG_THEMES[currentTheme].normal
        colorModeToggleInput.checked = (currentMode === 'dark')
        updateToggleBackground()
        updateModeLabel()

        document.querySelectorAll('.theme_card').forEach(c => {
            c.classList.toggle('selected', c.dataset.theme === currentTheme)
        })
    })
}


// =============================================================================
//  MODE TOGGLE  (normal / dark)
// =============================================================================
const colorModeToggleInput = document.getElementById('color_mode_toggle_input')
const colorToggleSwitch    = document.getElementById('color_toggle_switch')
const colorModeTrack       = document.getElementById('background_mode_track')

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
// =============================================================================

// Off-screen snapshot generator
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

Object.entries(BG_THEMES).forEach(([name, theme], index) => {
    const card = document.createElement('div')
    card.classList.add('theme_card')
    card.dataset.theme = name
    card.title = name

    if (snapshotGenerator) {
        snapshotGenerator.setColors(theme.normal)
        snapshotGenerator.drawFrame(1000 + index * 800)
        const url = snapshotGenerator.canvas.toDataURL('image/jpeg', 0.9)
        card.style.backgroundImage    = `url(${url})`
        card.style.backgroundSize     = 'cover'
        card.style.backgroundPosition = 'center'
    } else {
        card.style.background = `linear-gradient(135deg, ${theme.normal[1]}, ${theme.normal[3]})`
    }

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

if (snapshotGenerator) snapshotGenerator.destroy()
tempTarget.remove()
