// =============================================================================
//  AGENT IDENTITY SETTINGS — agent_identity_settings/agent_identity_settings_renderer.js
//  All logic for the agent identity view.
//  Depends on: ipcRenderer (declared in settings_renderer.js),
//              BG_THEMES, initGrainyBg, and SPHERE_THEMES
//              (loaded previously in settings.html).
// =============================================================================


// =============================================================================
//  BACKGROUND BANNER
//  The header uses its own grainy-bg, just like account_settings.
//  It synchronizes with the global theme upon opening and in real-time via IPC.
// =============================================================================
const agentIdentityHeaderInstance = window.initGrainyBg({
    target:    document.querySelector('.agent_identity_header'),
    speed:     2.3,
    intensity: 0.112,
    grainSize: 1.9,
    amplitude: 0.1,
})

if (ipcRenderer) {
    ipcRenderer.invoke('get-background').then((bg) => {
        const theme = bg?.theme ?? window.DEFAULT_BG_THEME
        const mode  = bg?.mode  ?? window.DEFAULT_BG_MODE
        agentIdentityHeaderInstance.setColors(window.BG_THEMES[theme][mode])
    })

    ipcRenderer.on('background-changed', (event, data) => {
        if (data?.colors) agentIdentityHeaderInstance.setColors(data.colors)
    })
}


// =============================================================================
//  NAME SELECT & WAKE WORD
// =============================================================================
const agentNameDropdown = document.getElementById('agent_name_dropdown')
const agentNameSelected = document.getElementById('agent_name_selected')
const agentNameAvatar   = document.getElementById('agent_name_avatar')
const agentNameLabel    = document.getElementById('agent_name_label')
const wakeWordDisplay   = document.getElementById('agent_identity_wake_word')

const wakeWords = {
    jarvis:  'Hey Jarvis',
    cortana: 'Hey Cortana',
    pixie:   'Hey Pixie',
}

let currentAgentName = 'jarvis'
let currentWakeWord = 'Hey Jarvis'

agentNameDropdown.addEventListener('click', (e) => {
    agentNameDropdown.classList.toggle('open')
    e.stopPropagation()
})

document.querySelectorAll('#agent_name_dropdown .agent_name_option').forEach(option => {
    option.addEventListener('click', (e) => {
        const agentName = option.dataset.value
        const label = option.lastChild.textContent.trim()

        agentNameAvatar.textContent = label.charAt(0).toUpperCase()
        agentNameLabel.textContent  = label
        agentNameSelected.classList.add('has_value')

        currentAgentName = agentName
        currentWakeWord = wakeWords[agentName] ?? ''
        wakeWordDisplay.textContent = currentWakeWord

        document.querySelectorAll('#agent_name_dropdown .agent_name_option').forEach(o => o.classList.remove('selected'))
        option.classList.add('selected')

        agentNameDropdown.classList.remove('open')
        e.stopPropagation()

        checkAgentIdentityDirty('name', agentName)
    })
})
document.addEventListener('click', () => agentNameDropdown.classList.remove('open'))

// =============================================================================
//  BUTTON ACTIVATION & IPC (agent-identity-data)
//  Tracks which fields have been modified since last save.
//  Enables the Save button only when there are pending changes.
//  On save, relays data to renderer.js -> WebSocket -> backend.
// =============================================================================
const saveAgentIdentityData = document.getElementById('agent_identity_save_btn')

// Activate Button Helper (visual) -- renamed to avoid colliding with
// account_settings_renderer.js's setSaveButtonDisabledStyle (both scripts
// share the same global scope since neither is a module).
function setAgentIdentitySaveButtonDisabledStyle(isDisabled) {
    if (isDisabled) saveAgentIdentityData.classList.add('disabled')
    else saveAgentIdentityData.classList.remove('disabled')
}

saveAgentIdentityData.disabled = true
setAgentIdentitySaveButtonDisabledStyle(true)

const agentIdentityInputContainers = {
    name: document.querySelector('.agent_name_select_div'),
}

// Snapshot of values at load time. `behavior` and `sphere` get their real
// initial values set later (once the default behavior / saved sphere are
// resolved), so they start as null and get filled in below.
const agentIdentityOriginalValues = { name: 'jarvis', behavior: null}
const agentIdentityDirtyFields = new Set()

// Checks if a given key has changed from its original value and updates dirtyFields
function checkAgentIdentityDirty(key, currentValue) {
    const changed = currentValue !== agentIdentityOriginalValues[key]
    if (changed) agentIdentityDirtyFields.add(key)
    else agentIdentityDirtyFields.delete(key)

    const isDisabled = agentIdentityDirtyFields.size === 0
    saveAgentIdentityData.disabled = isDisabled
    setAgentIdentitySaveButtonDisabledStyle(isDisabled)
}


saveAgentIdentityData.addEventListener('click', () => {
    if (agentIdentityDirtyFields.size === 0) return

    agentIdentityDirtyFields.forEach(key => {
        if (key === 'name') triggerSavePulse(agentIdentityInputContainers.name)
        // behavior: no animation intentionally
        if (key === 'behavior') triggerSavePulse(document.querySelector('#view_agent_identity .behavior_option.selected'))
    })

    const name     = currentAgentName
    const wakeWord = currentWakeWord
    const behavior = document.querySelector('#view_agent_identity .behavior_option.selected')?.dataset.value ?? null

    // Update snapshot with whatever is currently selected
    agentIdentityOriginalValues.name     = currentAgentName
    agentIdentityOriginalValues.behavior = behavior
    agentIdentityOriginalValues.sphere   = currentIdentitySphere

    agentIdentityDirtyFields.clear()
    saveAgentIdentityData.disabled = true
    setAgentIdentitySaveButtonDisabledStyle(true)

    if (ipcRenderer) ipcRenderer.send('agent-identity-data', { agent_name: name, wake_word: wakeWord, agent_behavior: behavior })
})


// ======================================
//  BEHAVIOR OPTIONS
// ======================================
const behaviorOptions = document.querySelectorAll('#view_agent_identity .behavior_option')

function selectBehavior(option) {
    behaviorOptions.forEach(o => o.classList.remove('selected'))
    option.classList.add('selected')
    checkAgentIdentityDirty('behavior', option.dataset.value)
}

behaviorOptions.forEach(opt => opt.addEventListener('click', () => selectBehavior(opt)))

if (behaviorOptions.length > 0) {
    // Set initial selection WITHOUT marking it dirty -- this is the baseline.
    behaviorOptions.forEach(o => o.classList.remove('selected'))
    behaviorOptions[0].classList.add('selected')
    agentIdentityOriginalValues.behavior = behaviorOptions[0].dataset.value
}


// =============================================================================
//  SPHERE SELECTOR — carousel
//  Renders one sphere centered in the viewport; left/right arrows move (and
//  select) the previous/next sphere. Clicking a peeking card jumps straight
//  to it. selectSphere(index) is the single source of truth — it re-centers
//  the track, swaps the live preview instance, and persists the choice, same
//  side effects the old grid click handler had, just reachable from arrows too.
// =============================================================================
const agentIdentitySpherePreview  = document.getElementById('agent_identity_sphere_preview')
const agentIdentitySphereSelector = document.getElementById('agent_identity_sphere_selector')
let   agentIdentitySphereInstance = null
let   sphereInitialized           = false

const sphereKeys = Object.keys(window.SPHERE_THEMES)
let   currentSphereIndex    = Math.max(0, sphereKeys.indexOf(window.DEFAULT_SPHERE))
let   currentIdentitySphere = sphereKeys[currentSphereIndex]

// ── Build carousel DOM: [prev arrow] [viewport > track > cards] [next arrow] ──
const prevArrow = document.createElement('button')
prevArrow.className = 'sphere_carousel_arrow sphere_carousel_prev'
prevArrow.setAttribute('aria-label', 'Previous sphere')
prevArrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`

const nextArrow = document.createElement('button')
nextArrow.className = 'sphere_carousel_arrow sphere_carousel_next'
nextArrow.setAttribute('aria-label', 'Next sphere')
nextArrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`

const sphereViewport = document.createElement('div')
sphereViewport.className = 'sphere_carousel_viewport'

const sphereTrack = document.createElement('div')
sphereTrack.className = 'sphere_carousel_track'
sphereViewport.appendChild(sphereTrack)

agentIdentitySphereSelector.appendChild(prevArrow)
agentIdentitySphereSelector.appendChild(sphereViewport)
agentIdentitySphereSelector.appendChild(nextArrow)

// Build one card per sphere theme, in stable order (Object.keys preserves
// insertion order — same order used everywhere as the index reference).
sphereKeys.forEach((key) => {
    const theme = window.SPHERE_THEMES[key]
    const card = document.createElement('div')
    card.classList.add('sphere_card')
    card.style.backgroundImage = `url(${theme.thumbnail})`
    card.dataset.sphere = key
    card.title = theme.label

    card.addEventListener('click', () => selectSphere(sphereKeys.indexOf(key)))

    sphereTrack.appendChild(card)
})

// Applies index as the active/selected sphere: re-centers the carousel,
// swaps the live preview instance, and sends sphere-changed (instant
// persistence — sphere is intentionally NOT part of dirty-tracking).
function selectSphere(index) {
    currentSphereIndex    = (index + sphereKeys.length) % sphereKeys.length   // wrap around both ends
    currentIdentitySphere = sphereKeys[currentSphereIndex]

    const cards = sphereTrack.querySelectorAll('.sphere_card')
    cards.forEach((c, i) => {
        c.classList.toggle('active', i === currentSphereIndex)
        c.classList.toggle('selected', i === currentSphereIndex)
    })
    centerCarousel()

    const theme = window.SPHERE_THEMES[currentIdentitySphere]
    if (agentIdentitySphereInstance) agentIdentitySphereInstance.destroy()
    agentIdentitySphereInstance = theme.create(agentIdentitySpherePreview)

    if (ipcRenderer) ipcRenderer.send('sphere-changed', { sphere: currentIdentitySphere })
}

// Slides the track (via transform) so the active card sits centered in the
// viewport. Offsets are computed in pixels from real layout, not guessed
// from CSS constants — stays correct even if card width/gap change later.
function centerCarousel() {
    const cards = sphereTrack.querySelectorAll('.sphere_card')
    const activeCard = cards[currentSphereIndex]
    if (!activeCard) return

    const viewportWidth = sphereViewport.clientWidth
    const offsetX = viewportWidth / 2 - (activeCard.offsetLeft + activeCard.offsetWidth / 2)
    sphereTrack.style.transform = `translate(${offsetX}px, -50%)`
}

prevArrow.addEventListener('click', () => selectSphere(currentSphereIndex - 1))
nextArrow.addEventListener('click', () => selectSphere(currentSphereIndex + 1))

// Re-center on resize — offsets are absolute pixels, not percentages.
window.addEventListener('resize', () => { if (sphereInitialized) centerCarousel() })



// =============================================================================
//  INIT -- called from settings_renderer.js when the view is opened.
//  The sphere is initialized here (not before) so that the canvas has
//  actual dimensions -- the view was hidden (0x0) until this moment.
// =============================================================================
function initAgentIdentity() {
    // Header bg -- always resize when returning to the view
    if (agentIdentityHeaderInstance) {
        agentIdentityHeaderInstance.resize()
    }

    // Sphere -- initialize only once. The view was hidden (0x0) until this
    // call, so this is also the first point where centerCarousel() can
    // measure real layout dimensions (offsetLeft/offsetWidth).
    if (sphereInitialized) return
    sphereInitialized = true

    if (ipcRenderer) {
        ipcRenderer.invoke('get-sphere').then((saved) => {
            const savedKey = saved || window.DEFAULT_SPHERE
            const index    = sphereKeys.indexOf(savedKey)

            currentSphereIndex    = index >= 0 ? index : 0
            currentIdentitySphere = sphereKeys[currentSphereIndex]

            const cards = sphereTrack.querySelectorAll('.sphere_card')
            cards.forEach((c, i) => {
                c.classList.toggle('active', i === currentSphereIndex)
                c.classList.toggle('selected', i === currentSphereIndex)
            })
            centerCarousel()

            const theme = window.SPHERE_THEMES[currentIdentitySphere]
            if (theme) agentIdentitySphereInstance = theme.create(agentIdentitySpherePreview)
        })
    }
}

window.initAgentIdentity = initAgentIdentity



// =============================================================================
// DATA INIT
// Loads initial agent identity data into the UI (name, wake word, behavior).
// agent identity data received as -> { "agent_name": "", "wake_word": "", "agent_behavior": "" }
// =============================================================================
function applyAgentIdentityData(data) {
    if (!data || Object.keys(data).length === 0) return

    if (data.agent_name) {
        const option = document.querySelector(`#agent_name_dropdown .agent_name_option[data-value="${data.agent_name}"]`)
        if (option) {
            const label = option.lastChild.textContent.trim()
            agentNameAvatar.textContent = label.charAt(0).toUpperCase()
            agentNameLabel.textContent  = label
            agentNameSelected.classList.add('has_value')
            document.querySelectorAll('#agent_name_dropdown .agent_name_option').forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')
        }

        currentAgentName = data.agent_name
        currentWakeWord  = data.wake_word ?? wakeWords[data.agent_name] ?? ''
        wakeWordDisplay.textContent = currentWakeWord
        agentIdentityOriginalValues.name = data.agent_name
    }

    if (data.agent_behavior) {
        const option = document.querySelector(`#view_agent_identity .behavior_option[data-value="${data.agent_behavior}"]`)
        if (option) {
            behaviorOptions.forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')
        }
        agentIdentityOriginalValues.behavior = data.agent_behavior
    }
}

window.applyAgentIdentityData = applyAgentIdentityData



// =============================================================================
// DATA INIT
// Loads initial agent identity data into the UI (name, wake word, behavior).
// agent identity data received as -> { "agent_name": "", "wake_word": "", "agent_behavior": "" }
// =============================================================================
function applyAgentIdentityData(data) {
    if (!data || Object.keys(data).length === 0) return

    if (data.agent_name) {
        const option = document.querySelector(`#agent_name_dropdown .agent_name_option[data-value="${data.agent_name}"]`)
        if (option) {
            const label = option.lastChild.textContent.trim()
            agentNameAvatar.textContent = label.charAt(0).toUpperCase()
            agentNameLabel.textContent  = label
            agentNameSelected.classList.add('has_value')
            document.querySelectorAll('#agent_name_dropdown .agent_name_option').forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')
        }

        currentAgentName = data.agent_name
        currentWakeWord  = data.wake_word ?? wakeWords[data.agent_name] ?? ''
        wakeWordDisplay.textContent = currentWakeWord
        agentIdentityOriginalValues.name = data.agent_name
    }

    if (data.agent_behavior) {
        const option = document.querySelector(`#view_agent_identity .behavior_option[data-value="${data.agent_behavior}"]`)
        if (option) {
            behaviorOptions.forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')
        }
        agentIdentityOriginalValues.behavior = data.agent_behavior
    }
}

window.applyAgentIdentityData = applyAgentIdentityData