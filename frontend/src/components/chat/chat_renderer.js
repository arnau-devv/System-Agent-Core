const { ipcRenderer } = require('electron')


// =============================================================================
//  MESSAGE STORE
//  Holds the full conversation history for this session.
//  Only STT_DONE (user speech) and AI_DONE (agent response) are tracked.
//  The window is never destroyed, so history persists across hide/show cycles.
// =============================================================================
const TRACKED_NAMES = ['STT_DONE', 'AI_DONE']
const messageStore  = []

ipcRenderer.on('backend-message', (event, message) => {
    console.log('[ChatRenderer]:', message.name, message.data)
    handleMessage(message)
})

function handleMessage(message) {
    if (!TRACKED_NAMES.includes(message.name)) return

    // STT_DONE carries 'user_input', AI_DONE carries 'response'
    const entry = {
        name: message.name,
        text: message.data.user_input || message.data.response || '',
    }

    messageStore.push(entry)
    renderMessage(entry)
}


// =============================================================================
//  CHAT RENDERING
//  Appends one message bubble at a time with a fade+slide-up entrance.
//  Reading from messageStore directly instead of passing entry would
//  re-render the full list on every message — intentionally avoided.
// =============================================================================
const chatMessages = document.getElementById('chat_messages')

function renderMessage(entry) {
    const source = entry.name === 'AI_DONE' ? 'agent' : 'user'

    const div = document.createElement('div')
    div.classList.add('chat_message')
    div.innerHTML = `<h3>${source}</h3><p>${entry.text}</p>`

    // Set initial hidden state before inserting so the transition has a from-state
    div.style.opacity    = '0'
    div.style.transform  = 'translateY(10px)'
    div.style.transition = 'opacity 0.3s ease, transform 0.3s ease'

    chatMessages.appendChild(div)

    // Reading offsetHeight forces a reflow — required for CSS transitions to
    // fire correctly when styles change immediately after insertion
    div.offsetHeight

    div.style.opacity   = '1'
    div.style.transform = 'translateY(0)'

    chatMessages.scrollTop = chatMessages.scrollHeight
}


// =============================================================================
//  HEADER
// =============================================================================
// Hides the window instead of destroying it — conversation history is kept
document.getElementById('minimize_chat_panel_btn').addEventListener('click', () => {
    ipcRenderer.send('close-chat')
})


// =============================================================================
//  CHAT INPUT
//  Sends on button click or Enter key. WebSocket send is not yet implemented.
// =============================================================================
const chatInput = document.getElementById('chat_input')
const sendBtn   = document.getElementById('send_chat_btn')

sendBtn.addEventListener('click', sendMessage)
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage()
})

function sendMessage() {
    const text = chatInput.value.trim()
    if (!text) return

    console.log('User sent:', text)
    // TODO: forward to backend via WebSocket
    chatInput.value = ''
}


// =============================================================================
//  BACKGROUND
//  Initialized on load using the persisted config. The 'background-changed'
//  event keeps the color in sync when the user changes it in settings.
// =============================================================================
ipcRenderer.invoke('get-background').then((bg) => {
    const theme  = bg?.theme ?? window.DEFAULT_BG_THEME
    const mode   = bg?.mode  ?? window.DEFAULT_BG_MODE
    const colors = window.BG_THEMES[theme][mode]

    window.initGrainyBg({
        fullscreen: true,
        colors,
        speed:     1.2,
        intensity: 0.08,
        grainSize: 2.2,
        amplitude: 0.06,
    })

    // Apply colors to any elements that use CSS variables (e.g. accents, borders)
    window.setBgColors(colors)
})

ipcRenderer.on('background-changed', (event, data) => {
    if (window.setBgColors) window.setBgColors(data.colors)
})