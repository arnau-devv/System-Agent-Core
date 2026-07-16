const { ipcRenderer } = require('electron')
const { playSound, setVolume } = require('./audioEngine')


// =============================================================================
//  WEBSOCKET — BACKEND CONNECTION
//  Connects to the Python backend. All incoming messages are forwarded to
//  main.js via IPC, which then routes them to the appropriate windows.
//  Reconnects automatically every second on drop.
// =============================================================================
function connectWebSocket() {
   socket = new WebSocket('ws://localhost:8000/ws')

   socket.onopen  = () => console.log('Connected to backend')
   socket.onerror = () => socket.close()
   socket.onclose = () => {
      console.log('Connection lost. Retrying in 1s...')
      setTimeout(connectWebSocket, 1000)
   }

   socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log("[backend-message] ",  message)
      ipcRenderer.send('backend-message', message)    // forward to main.js for routing
   }
}
connectWebSocket()


// ---------------------------- AGENT BEHAVIOR DATA ----------------------------

// Listens for user profile updates from account_settings_renderer.js -> main.js 
// and sends them to the backend via WebSocket
// data -> {user_name: name, user_alias: alias, user_country: selectedCountry}
ipcRenderer.on('user-data', (event, message) => {
   if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
         name: 'user-data',
         data: message
      }))
   }
   
   console.log({
      user_name: message.user_name,
      alias: message.user_alias,
      country: message.user_country
      });
})

// Listens for agent identiry updates from agent_settings_renderer.js -> main.js 
// and sends them to the backend via WebSocket
// data -> {agent_name: name, wake_word: currentWakeWord, agent_behavior: behavior}
ipcRenderer.on('agent-identity-data', (event, message) => {
   if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
         name: 'agent-identity-data',
         data: message
      }))
   }
   console.log({
      agent_name: message.agent_name,
      wake_word: message.wake_word,
      behavior: message.agent_behavior
      });
})


// =============================================================================
//  TITLEBAR
// =============================================================================
// ----------- DOM references -----------
const closeAppBtn     = document.getElementById('close_app_btn')
const titlebar        = document.getElementById('titlebar') 
const statusDiv       = document.getElementById('connection_status')
const statusText      = document.getElementById('connection_status_text')
const connectedLlmP   = document.getElementById('tooltip_llm_container')
const connectedTtsP   = document.getElementById('tooltip_tts_container')
const connectedWwP    = document.getElementById('tooltip_ww_container')
const connectedLlmSpan = document.getElementById('tooltip_llm')
const connectedTtsSpan = document.getElementById('tooltip_tts')
const connectedWwSpan  = document.getElementById('tooltip_ww')

// ---- App closing IPC -> main.js ----
closeAppBtn.addEventListener('click', () => { ipcRenderer.send('close-app') })


// ----------- Event lists -----------
const titlebarEvents = [
   'LLM_PROVIDER_NAMES', 'ACTIVE_LLM_PROVIDER', 'ALL_LLM_PROVIDERS_DOWN',
   'TTS_PROVIDER_NAMES', 'ACTIVE_TTS_PROVIDER', 'ALL_TTS_PROVIDERS_DOWN',
   'WW_PROVIDER_NAMES',  'ACTIVE_WW_PROVIDER',  'ALL_WW_PROVIDERS_DOWN'
]

const sphereEvents = ['WAKE_DETECTED', 'IDLE']

const chatEvents = ["CHAT_MESSAGE"]
// ----------- Message routing -----------
// Decides if this window should handle a given backend message
function canHandleBackendMessage(message, events) {
   return events.includes(message.name)
}

ipcRenderer.on('backend-message', (event, message) => {
   if (canHandleBackendMessage(message, titlebarEvents)) {
      console.log('[Titlebar]:', message.name, message.data)
      handleConnections(message)
   }
   if (canHandleBackendMessage(message, sphereEvents)) {
      console.log('[Sphere]:', message.name, message.data)
      setTimeout(() => sphereInstance?.setState(message.name), sphereDelays[message.name])
   }
   if (canHandleBackendMessage(message, chatEvents)) {
      console.log('[Chat]:', message.name, message.data)
      if (message.name === "CHAT_MESSAGE") handleMessage(message)
   }
})


// ----------- Connection status -----------
// Tracks which of the 3 provider slots are active: [0: LLM, 1: TTS, 2: WW]
let providers = [null, null, null]

// We wait for LLM and TTS to report at least once before showing connected/disconnected,
// because they may arrive in any order at startup.
let initializedProviders = new Set()

function handleConnections(message) {
   // -- LLM
   if (message.name === 'ALL_LLM_PROVIDERS_DOWN') {
      providers[0] = null
      connectedLlmSpan.textContent = 'not connected'
   } else if (message.name === 'ACTIVE_LLM_PROVIDER') {
      providers[0] = message.data
      initializedProviders.add(0)
      connectedLlmSpan.textContent = providers[0]
      connectedLlmP.classList.remove('connecting')
   }

    // -- TTS
   if (message.name === 'ALL_TTS_PROVIDERS_DOWN') {
      providers[1] = null
      connectedTtsSpan.textContent = 'not connected'
   } else if (message.name === 'ACTIVE_TTS_PROVIDER') {
      providers[1] = message.data
      initializedProviders.add(1)
      connectedTtsSpan.textContent = providers[1]
      connectedTtsP.classList.remove('connecting')
   }

    // -- Wake word (optional, doesn't affect connection dot)
   if (message.name === 'ACTIVE_WW_PROVIDER') {
      providers[2] = message.data
      connectedWwSpan.textContent = providers[2]
      connectedWwP.classList.remove('connecting')
   }

    // Only update the status dot once both LLM and TTS have reported
   if (initializedProviders.has(0) && initializedProviders.has(1)) {
      updateConnectionStatus()
   }
}

function updateConnectionStatus() {
   statusDiv.classList.remove('connecting')
   const allConnected = providers.slice(0, 2).every(p => p !== null)
   statusDiv.classList.toggle('disconnected', !allConnected)
   statusText.textContent = allConnected ? 'connected' : 'disconnected'
}

// ----------- Tooltip hover behavior -----------
// The tooltip stays visible when the cursor moves into it from the status dot.
// Entering the tooltip itself hides it (acts as a dismiss).
const connectionStatus = document.getElementById('connection_status')
const tooltip = connectionStatus.querySelector('.conection_status_tooltip')

connectionStatus.addEventListener('mouseenter', () => {
   tooltip.style.opacity    = '1'
   tooltip.style.visibility = 'visible'
})
connectionStatus.addEventListener('mouseleave', (e) => {
   if (tooltip.contains(e.relatedTarget)) return
   tooltip.style.opacity    = '0'
   tooltip.style.visibility = 'hidden'
})
tooltip.addEventListener('mouseenter', () => {
   tooltip.style.opacity    = '0'
   tooltip.style.visibility = 'hidden'
})

// ----------- Panel buttons -----------
document.getElementById('settings_panel').addEventListener('click', () => {
   ipcRenderer.send('toggle-settings')
})
document.getElementById('agent_settings_panel').addEventListener('click', () => {
   ipcRenderer.send('toggle-agent-settings')
})


// =============================================================================
//  BACKGROUND
//  Initialized once on load using the persisted config. After that, the
//  'background-changed' event keeps it in sync when settings change.
// =============================================================================
ipcRenderer.invoke('get-background').then((bg) => {
   const theme  = bg?.theme  ?? window.DEFAULT_BG_THEME
   const mode   = bg?.mode   ?? window.DEFAULT_BG_MODE
   const colors = bg?.colors ?? window.BG_THEMES[theme][mode]

   window.initGrainyBg({
      fullscreen: true,
      colors,
      speed:     2.3,
      intensity: 0.112,
      grainSize: 1.9,
      amplitude: 0.1,
   })
})

ipcRenderer.on('background-changed', (event, data) => {
   if (window.setBgColors) window.setBgColors(data.colors)
})


// =============================================================================
//  SPHERE
//  Initialized on load from persisted config. Responds to 'sphere-changed'
//  (user picked a new sphere in agent settings) and to backend animation
//  events like WAKE_DETECTED and IDLE.
// =============================================================================
const sphereContainer = document.getElementById('sphere_container')
const sphereDelays    = { WAKE_DETECTED: 250, IDLE: 250 }
let   sphereInstance  = null

// ----------- Init from saved config -----------
ipcRenderer.invoke('get-sphere').then((saved) => {
   if (saved === 'rings') sphereInstance = window.createRingsSphere(sphereContainer)
   else if (saved === 'ion') sphereInstance = window.createIonSphere(sphereContainer)
})

// ----------- Live swap when user changes sphere in agent settings -----------
ipcRenderer.on('sphere-changed', (event, data) => {
   if (sphereInstance) sphereInstance.destroy()
   if (data.sphere === 'rings') sphereInstance = window.createRingsSphere(sphereContainer)
   else if (data.sphere === 'ion') sphereInstance = window.createIonSphere(sphereContainer)
})


// =============================================================================
//  NAVBAR
// =============================================================================

const navbarMarker    = document.getElementById('navbar_marker')
const navbarContainer = document.getElementById('navbar_container')
const leftArrow       = document.getElementById('arrow_left')
const rightArrow      = document.getElementById('arrow_right')

// Returns true if any module is currently open.
// Add every module view here to keep the check centralized.
function areOpenedModules() {
   return chatView.classList.contains('module_opened')
}

// Applies subtle CSS state to the navbar when a module is open/closed.
// Call this inside every module's toggle click handler.
function openedModuleNavbarBehavior() {
   const opened = areOpenedModules()
   navbarMarker.classList.toggle('module_opened', opened)
   navbarContainer.classList.toggle('module_opened', opened)
   leftArrow.classList.toggle('module_opened', opened)
   rightArrow.classList.toggle('module_opened', opened)
}