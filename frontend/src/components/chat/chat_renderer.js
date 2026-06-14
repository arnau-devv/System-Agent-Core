const { ipcRenderer } = require('electron')

/* ================================================
   MESSAGE STORE
   Only "STT_DONE" and "AI_DONE" messages are stored.
   ================================================ */

const TRACKED_NAMES = ['STT_DONE', 'AI_DONE']

const messageStore = []

ipcRenderer.on('backend-message', (event, message) => {
    console.log('RAW:', message.name, message.data)
    handleMessage(message)
})

function handleMessage(message) {
    if (!TRACKED_NAMES.includes(message.name)) return

    const entry = {
        name: message.name,
        text: message.data.user_input || message.data.response || '',
    }

    messageStore.push(entry)
    renderMessages()
}


/* ================================================
   CHAT RENDERING
   Appends only the latest message to the DOM.
   ================================================ */

function renderMessages() {
    const entry = messageStore[messageStore.length - 1]

    const div = document.createElement('div')
    div.classList.add('chat_message')

    div.innerHTML = `
        <h3>${entry.name}</h3>
        <p>${entry.text}</p>
    `

    // Start invisible and shifted down
    div.style.opacity = '0'
    div.style.transform = 'translateY(10px)'
    div.style.transition = 'opacity 0.3s ease, transform 0.3s ease'

    chatMessages.appendChild(div)

    // Force reflow so the transition has a starting state to animate from
    div.offsetHeight

    div.style.opacity = '1'
    div.style.transform = 'translateY(0)'

    // Auto-scroll to the latest message
    chatMessages.scrollTop = chatMessages.scrollHeight
}


/* ================================================
   DOM REFERENCES
   ================================================ */

const chatMessages = document.getElementById('chat_messages')
const chatInput    = document.getElementById('chat_input')
const sendBtn      = document.getElementById('send_chat_btn')
const minimizeBtn  = document.getElementById('minimize_chat_panel_btn')


/* ================================================
   CHAT HEADER — close button
   Hides the window without destroying it (conversation is kept)
   ================================================ */

minimizeBtn.addEventListener('click', () => {
    ipcRenderer.send('close-chat')
})


/* ================================================
   CHAT INPUT — send on button click or Enter key
   ================================================ */

sendBtn.addEventListener('click', sendMessage)

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage()
})

function sendMessage() {
    const text = chatInput.value.trim()
    if (!text) return

    console.log('User sent:', text)
    // TODO: send via WebSocket
    chatInput.value = ''
}