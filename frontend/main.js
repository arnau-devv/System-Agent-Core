const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const { spawn } = require('child_process')

let pythonProcess
let mainWindow
let chatWindow


/* ================================================
   MAIN WINDOW
   ================================================ */

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 750,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    Menu.setApplicationMenu(null)
    mainWindow.loadFile('src/index.html')
    mainWindow.webContents.openDevTools()
}


/* ================================================
   CHAT WINDOW
   ================================================ */

function createChatWindow() {
    chatWindow = new BrowserWindow({
        width: 450,
        height: 600,
        minWidth: 300,
        minHeight: 400,
        frame: false,
        show: false,        // Start hidden — opened on demand via IPC
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    chatWindow.loadFile('src/components/chat/chat.html')

    // When the user closes the chat window, just hide it instead of destroying it
    chatWindow.on('close', (event) => {
        event.preventDefault()
        chatWindow.hide()
    })
}


/* ================================================
   IPC — communication between windows
   ================================================ */

// Main window sends 'toggle-chat' when the navbar button is clicked
ipcMain.on('toggle-chat', () => {
    if (chatWindow.isVisible()) {
        chatWindow.hide()
    } else {
        chatWindow.show()
        chatWindow.focus()
    }
})

// Kill the Python process when all windows are closed
ipcMain.on('close-app', () => {
    if (pythonProcess) {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t'])
        } else {
            pythonProcess.kill()
        }
    }
    app.quit()
})

// Chat window sends 'close-chat' when the header button is clicked
ipcMain.on('close-chat', () => {
    chatWindow.hide()
})


// WebSocket Message Router
ipcMain.on('backend-message', (event, message) => {
    // CHAT MESSAGES
    handleChatMessages(message)
})

function handleChatMessages(message) {
    if (message.name === 'STT_DONE' || message.name === 'AI_DONE') {
        chatWindow.webContents.send('backend-message', message)
}}





/* ================================================
   APP STARTUP
   ================================================ */

app.whenReady().then(() => {

    // Launch the Python backend as a subprocess
    pythonProcess = spawn('../backend/venv/Scripts/python.exe', ['main.py'], { cwd: '../backend' })
    pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`))
    pythonProcess.stderr.on('data', (data) => console.error(`Python error: ${data}`))

    createMainWindow()
    createChatWindow()
})
