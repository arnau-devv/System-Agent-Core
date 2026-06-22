const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const { spawn } = require('child_process')


// --------------------------------- JSON STYLES PERSISTANCE --------------------------
const fs   = require('fs')
const path = require('path')

const stylesPath = path.join(app.getPath('appData'), '..', 'Local', app.getName(), 'ui', 'styles.json')

function readStyles() {
    if (!fs.existsSync(stylesPath)) return null
    return JSON.parse(fs.readFileSync(stylesPath, 'utf-8'))
}

function writeStyles(data) {
    fs.mkdirSync(path.dirname(stylesPath), { recursive: true })
    fs.writeFileSync(stylesPath, JSON.stringify(data, null, 2))
}
// ------------------------------------------------------------------------------------


let pythonProcess
let mainWindow
let chatWindow
let settingsWindow
let agentSettingsWindow
let currentBackground = readStyles()


// ------------------------------------- WINDOWS -------------------------------------
// ----------- MAIN WINDOW -----------
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 750,
        backgroundColor: "#000000",
        minWidth: 300,
        minHeight: 400,
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

// ----------- CHAT WINDOW -----------
function createChatWindow() {
    chatWindow = new BrowserWindow({
        width: 450,
        height: 600,
        backgroundColor: "#000000",
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
//     chatWindow.on('close', (event) => {
//         event.preventDefault()
//         chatWindow.hide()
//     })
}

// ----------- SETTINGS WINDOW -----------
function createSettingsWindow() {
    settingsWindow = new BrowserWindow({
        width: 840,
        height: 525,
        minWidth: 570,
        minHeight: 400,
        backgroundColor: "#000000",
        frame: false,
        // show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    settingsWindow.loadFile('src/components/settings/settings.html')
    // When the user closes the chat window, just hide it instead of destroying it
    // settingsWindow.on('close', (event) => {
    //     event.preventDefault()
    //     settingsWindow.hide()
    // })

}

// ----------- AGENT SETTINGS WINDOW -----------
function createAgentSettingsWindow() {
    agentSettingsWindow = new BrowserWindow({
        width: 440,
        height: 625,
        minWidth: 300,
        minHeight: 400,
        backgroundColor: "#000000",
        frame: false,
        // show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    agentSettingsWindow.loadFile('src/components/agent_settings/agent_settings.html')
    // When the user closes the chat window, just hide it instead of destroying it
    // agentSettingsWindow.on('close', (event) => {
    //     event.preventDefault()
    //     agentSettingsWindow.hide()
    // })

}

// ------------------------ IPC — communication between windows ------------------------
// ------- TOGGLE WINDOWS LOGIC ---------
ipcMain.on('toggle-chat', () => {
    if (chatWindow.isVisible()) {
        chatWindow.hide()
    } else {
        chatWindow.show()
        chatWindow.focus()
    }
})
ipcMain.on('toggle-settings', () => {
    if (settingsWindow) {
        settingsWindow.destroy()
        settingsWindow = null
    } else {
        createSettingsWindow()
        settingsWindow.show()
        settingsWindow.focus()
    }
})
ipcMain.on('toggle-agent-settings', () => {
    if (agentSettingsWindow) {
        agentSettingsWindow.destroy()
        agentSettingsWindow = null
    } else {
        createAgentSettingsWindow()
        agentSettingsWindow.show()
        agentSettingsWindow.focus()
    }
})

// ------- CLOSE WINDOWS LOGIC ---------
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

ipcMain.on('close-chat', () => { chatWindow.hide() })
ipcMain.on('close-settings', () => { settingsWindow?.destroy(); settingsWindow = null })
ipcMain.on('close-agent-settings', () => { agentSettingsWindow?.destroy(); agentSettingsWindow = null })


// -------------------- SETTINGS WINDOW LOGIC -------------------------------------
ipcMain.on('background-changed', (event, data) => {
    currentBackground = data
    writeStyles(data)
    mainWindow.webContents.send('background-changed', data)
    if (chatWindow && !chatWindow.isDestroyed()) {
        chatWindow.webContents.send('background-changed', data);
    }
    if (agentSettingsWindow && !agentSettingsWindow.isDestroyed()) {
        agentSettingsWindow.webContents.send('background-changed', data);
    }
})

ipcMain.handle('get-background', () => { return currentBackground })


// ----------------------------------- WebSocket Message Router ------------------------
ipcMain.on('backend-message', (event, message) => {
    // Messages -> Main Window
    handleMainMessages(message)
    // Messages -> Chat Window
    handleChatMessages(message)
})

const mainEvents = ['LLM_PROVIDER_NAMES', 'ACTIVE_LLM_PROVIDER', 'ALL_LLM_PROVIDERS_DOWN',
                    'TTS_PROVIDER_NAMES', 'ACTIVE_TTS_PROVIDER', 'ALL_TTS_PROVIDERS_DOWN',
                    'WW_PROVIDER_NAMES', 'ACTIVE_WW_PROVIDER', 'ALL_WW_PROVIDERS_DOWN',
                    'WAKE_DETECTED', 'IDLE'
                    ]
function handleMainMessages(message) {
    if (mainEvents.includes(message.name)) mainWindow.webContents.send('backend-message', message)
}

function handleChatMessages(message) {
    if (message.name === 'STT_DONE' || message.name === 'AI_DONE') {
        chatWindow.webContents.send('backend-message', message)
}}



// ----------- APP STARTUP -----------
app.whenReady().then(() => {

    // Launch the Python backend as a subprocess
    pythonProcess = spawn('../backend/venv/Scripts/python.exe', ['main.py'], { cwd: '../backend' })
    pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`))
    pythonProcess.stderr.on('data', (data) => console.error(`Python error: ${data}`))

    createMainWindow()
    createChatWindow()
})
