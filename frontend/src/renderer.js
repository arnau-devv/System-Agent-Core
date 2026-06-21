const { ipcRenderer, ipcMain } = require('electron')

// ------------ WEBSOCKET CONNECTION ------------
function connectWebSocket() {
   const socket = new WebSocket('ws://localhost:8000/ws')

   socket.onopen = () => console.log('Connected to backend')
   socket.onerror = () => socket.close()
   socket.onclose = () => {
      console.log('Connection lost. Retrying in 1s...')
      setTimeout(connectWebSocket, 1000)
   }

   socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      ipcRenderer.send('backend-message', message)  // forward to main.js
   }
}

connectWebSocket()

//Filters messages by intern modules (titlebar, ...) to use them
function canHandleMessage(message, module_name, module_events) {
   if (module_name === 'titlebar' && module_events.includes(message.name)) return true
   if (module_name === 'sphere' && sphereEvents.includes(message.name)) return true
   return false
}

// ------------ DOM REFERENCES ------------
const openChatBtn = document.getElementById('open_chat_btn')
const closeAppBtn = document.getElementById('close_app_btn')


// -----------------------------------------------------------------------------
//                                  TITLEBAR 
// -----------------------------------------------------------------------------
ipcRenderer.on('backend-message', (event, message) => {
   if (canHandleMessage(message, "titlebar", titlebarEvents)) {
      console.log('[Titlebar]:', message.name, message.data)
      titlebar_event_router(message)
   }
})
function titlebar_event_router(message) {
   // Connection Status
   if (connectionEvents.includes(message.name)) handleConnections(message)
}

// ----------------------------- CONNECTION STATUS -----------------------------
const statusDiv = document.getElementById('connection_status')
const statusText = document.getElementById('connection_status_text')

const connectedLlmP = document.getElementById('tooltip_llm_container')
const connectedTtsP = document.getElementById('tooltip_tts_container')
const connectedWwP = document.getElementById('tooltip_ww_container')
const connectedLlmSpan = document.getElementById('tooltip_llm')
const connectedTtsSpan = document.getElementById('tooltip_tts')
const connectedWwSpan = document.getElementById('tooltip_ww')

const titlebarEvents = ['LLM_PROVIDER_NAMES', 'ACTIVE_LLM_PROVIDER', 'ALL_LLM_PROVIDERS_DOWN',
                        'TTS_PROVIDER_NAMES', 'ACTIVE_TTS_PROVIDER', 'ALL_TTS_PROVIDERS_DOWN',
                        'WW_PROVIDER_NAMES', 'ACTIVE_WW_PROVIDER', 'ALL_WW_PROVIDERS_DOWN']


const connectionEvents = ['LLM_PROVIDER_NAMES', 'ACTIVE_LLM_PROVIDER', 'ALL_LLM_PROVIDERS_DOWN',
                           'TTS_PROVIDER_NAMES', 'ACTIVE_TTS_PROVIDER', 'ALL_TTS_PROVIDERS_DOWN',
                           'WW_PROVIDER_NAMES', 'ACTIVE_WW_PROVIDER', 'ALL_WW_PROVIDERS_DOWN']

let providers = [null, null, null] // possible api_provers positions [0: llm, 1: tts, 2: wake word]
let initializedProviders = new Set() // tracks which providers have connected at least once.
function handleConnections(message) {
   //LLM Providers
   if (message.name === 'ALL_LLM_PROVIDERS_DOWN') {
      providers[0] = null
      connectedLlmSpan.textContent = "not connected"
   }
   else if (message.name === 'ACTIVE_LLM_PROVIDER') { 
      providers[0] = message.data; initializedProviders.add(0) 
      connectedLlmSpan.textContent = providers[0]
      connectedLlmP.classList.remove('connecting')
   }
   //TTS Providers
   if (message.name === 'ALL_TTS_PROVIDERS_DOWN') {
      providers[1] = null
      connectedTtsSpan.textContent = "not connected"
   }
   else if (message.name === 'ACTIVE_TTS_PROVIDER') { 
      providers[1] = message.data; initializedProviders.add(1) 
      connectedTtsSpan.textContent = providers[1]
      connectedTtsP.classList.remove('connecting')
   }
   //WW   
   if (message.name === 'ACTIVE_WW_PROVIDER') {
      providers[2] = message.data
      connectedWwSpan.textContent = providers[2]
      connectedWwP.classList.remove('connecting')
   }

   // Only update status if LLM and TTS have connected at least once.
   if (initializedProviders.has(0) && initializedProviders.has(1)) {
      updateConnectionStatus()
   }
}
function updateConnectionStatus() {
   statusDiv.classList.remove('connecting')
   
   let allConnected = providers.slice(0, 2).every(p => p !== null)
   if (allConnected) {
         statusDiv.classList.remove('disconnected')
         statusText.textContent = 'connected'
      } else {
         statusDiv.classList.add('disconnected')
         statusText.textContent = 'disconnected'
      }
}
//-- Hover behavior
const connectionStatus = document.getElementById('connection_status')
const tooltip = connectionStatus.querySelector('.conection_status_tooltip')

connectionStatus.addEventListener('mouseenter', () => {
   tooltip.style.opacity = '1'
   tooltip.style.visibility = 'visible'
})

connectionStatus.addEventListener('mouseleave', (e) => {
   if (tooltip.contains(e.relatedTarget)) return
   tooltip.style.opacity = '0'
   tooltip.style.visibility = 'hidden'
})

tooltip.addEventListener('mouseenter', () => {
   tooltip.style.opacity = '0'
   tooltip.style.visibility = 'hidden'
})
// --

// ----------------------------- TOOLS -----------------------------
// --- Settings
const settingsButton = document.getElementById('settings_panel')
settingsButton.addEventListener('click', () => { ipcRenderer.send('toggle-settings')})
// --- Agent Settings
const agentSettingsButton = document.getElementById('agent_settings_panel')
agentSettingsButton.addEventListener('click', () => { ipcRenderer.send('toggle-agent-settings')})





// -----------------------------------------------------------------------------
//                                  BACKGOUND
// Background change logic -> settings.js 
// -----------------------------------------------------------------------------
ipcRenderer.on('background-changed', (event, data) => {
   if (window.setBgColors) window.setBgColors(data.colors);
});

// -------------- BACKGROUND INIT gets loaded json info from main)--------------
ipcRenderer.invoke('get-background').then((bg) => {
   const theme = (bg && bg.theme) ? bg.theme : window.DEFAULT_BG_THEME
   const mode  = (bg && bg.mode)  ? bg.mode  : window.DEFAULT_BG_MODE
   const colors = window.BG_THEMES[theme][mode]

   window.initGrainyBg({
      fullscreen: true,
      colors:    colors,
      speed:     2.3,
      intensity: 0.112,
      grainSize: 1.9,
      amplitude: 0.1,
   })
})





// -----------------------------------------------------------------------------
//                                  SPHERE 
// -----------------------------------------------------------------------------
// The backend processes events ahead of the UI needing to react visually,
// delays compensate for that head start so the sphere transitions right on time.
const sphereEvents = ['WAKE_DETECTED', 'IDLE']
const sphereDelays = { WAKE_DETECTED: 250, IDLE: 250 }

ipcRenderer.on('backend-message', (event, message) => {
   if (canHandleMessage(message, "sphere", sphereEvents)) {
      console.log('[Sphere]:', message.name, message.data)
      setTimeout(() => window.sphereSetState(message.name), sphereDelays[message.name])
   }
})


// ---------------- NAVBAR ----------------
// open / close chat window
closeAppBtn.addEventListener('click', () => {
   ipcRenderer.send('close-app')
})
openChatBtn.addEventListener('click', () => {
   ipcRenderer.send('toggle-chat')
})


