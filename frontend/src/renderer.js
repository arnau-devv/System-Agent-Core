const { ipcRenderer, ipcMain } = require('electron')

// ------ WEBSOCKET CONNECTION ------
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

/* ================================================
   DOM REFERENCES
   ================================================ */

const openChatBtn = document.getElementById('open_chat_btn')
const closeAppBtn = document.getElementById('close_app_btn')


/* ================================================
   NAVBAR — open / close chat window via IPC
   ================================================ */

closeAppBtn.addEventListener('click', () => {
   ipcRenderer.send('close-app')
})


// Tell the main process to toggle the chat window
openChatBtn.addEventListener('click', () => {
   ipcRenderer.send('toggle-chat')
})
