const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const { spawn } = require('child_process')
const configStore = require('./src/configStore')
const path = require('path');

// =============================================================================
//  WINDOW REFERENCES
//  Kept at module scope so IPC handlers can reach any window at any time.
//  - mainWindow:          always alive while the app is running
//  - chatWindow:          created once, hidden/shown (never destroyed — keeps conversation state)
//  - settingsWindow:      created and destroyed on each toggle
//  - agentSettingsWindow: created and destroyed on each toggle
// =============================================================================
let pythonProcess
let mainWindow
let chatWindow
let settingsWindow
let agentSettingsWindow


// =============================================================================
//  WINDOW FACTORIES
// =============================================================================

// ----------- Main window -----------
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 750,
        backgroundColor: '#000000',
        minWidth: 300,
        minHeight: 400,
        frame: false,
        icon: path.join(__dirname, 'assets', 'images', 'ai_sphere.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    Menu.setApplicationMenu(null)
    mainWindow.loadFile('src/index.html')
    mainWindow.webContents.openDevTools()
}

// ----------- Chat window -----------
function createChatWindow() {
    chatWindow = new BrowserWindow({
        width: 450,
        height: 600,
        backgroundColor: '#000000',
        minWidth: 300,
        minHeight: 400,
        frame: false,
        show: false,    // Hidden at startup — toggled via IPC
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    chatWindow.loadFile('src/components/chat/chat.html')
}

// ----------- Settings window -----------
function createSettingsWindow() {
    settingsWindow = new BrowserWindow({
        width: 1040,
        height: 680,
        minWidth: 570,
        minHeight: 400,
        backgroundColor: '#000000',
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    settingsWindow.loadFile('src/components/settings/settings.html')
}

// ----------- Agent settings window -----------
function createAgentSettingsWindow() {
    agentSettingsWindow = new BrowserWindow({
        width: 440,
        height: 625,
        minWidth: 300,
        minHeight: 400,
        backgroundColor: '#000000',
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    agentSettingsWindow.loadFile('src/components/agent_settings/agent_settings.html')
}


// ===============================================================================================================
//                                              IPC — WINDOW MANAGEMENT
// ===============================================================================================================

// ----------- Toggle visibility -----------
// Chat is hidden/shown to preserve conversation history across opens.
// Settings windows are destroyed and recreated — no state needs to persist.
// ipcMain.on('toggle-chat', () => {
//     if (chatWindow.isVisible()) { chatWindow.hide() }
//     else { chatWindow.show(); chatWindow.focus() }
// })

ipcMain.on('toggle-settings', () => {
    if (settingsWindow) { settingsWindow.destroy(); settingsWindow = null }
    else { createSettingsWindow(); settingsWindow.show(); settingsWindow.focus() }
})

ipcMain.on('toggle-agent-settings', () => {
    if (agentSettingsWindow) { agentSettingsWindow.destroy(); agentSettingsWindow = null }
    else { createAgentSettingsWindow(); agentSettingsWindow.show(); agentSettingsWindow.focus() }
})

// ----------- Close handlers -----------
ipcMain.on('close-app', () => {
    // Kill the Python subprocess before quitting
    if (pythonProcess) {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', pythonProcess.pid, '/f', '/t'])
        } else {
            pythonProcess.kill()
        }
    }
    app.quit()
})

ipcMain.on('close-chat',           () => { chatWindow.hide() })
ipcMain.on('close-settings',       () => { settingsWindow?.destroy();      settingsWindow = null })
ipcMain.on('close-agent-settings', () => { agentSettingsWindow?.destroy(); agentSettingsWindow = null })


// =============================================================================
//  IPC — BACKGROUND
//  Settings window sends 'background-changed' with { theme, mode, colors }.
//  main saves it to disk and broadcasts to all other open windows so they
//  update in real time without needing to reload.
// =============================================================================
ipcMain.on('background-changed', (event, data) => {
    configStore.write('background', data)

    mainWindow.webContents.send('background-changed', data)
    if (settingsWindow && !settingsWindow.isDestroyed())
        settingsWindow.webContents.send('background-changed', data)
    if (chatWindow && !chatWindow.isDestroyed())
        chatWindow.webContents.send('background-changed', data)
    if (agentSettingsWindow && !agentSettingsWindow.isDestroyed())
        agentSettingsWindow.webContents.send('background-changed', data)
})

// Renderer windows invoke this on load to get the persisted background
ipcMain.handle('get-background', () => configStore.get('background'))


// =============================================================================
//  IPC — SPHERE
//  Agent settings sends 'sphere-changed' with { sphere: 'rings' | 'ion' }.
//  main saves the sphere key to disk and forwards to mainWindow so the
//  live sphere updates immediately without reopening the app.
// =============================================================================
ipcMain.on('sphere-changed', (event, data) => {
    configStore.write('sphere', data.sphere)     // persist string key, not the whole object

    if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('sphere-changed', data)
})

// Renderer windows invoke this on load to get the persisted sphere key
ipcMain.handle('get-sphere', () => configStore.get('sphere'))


// =============================================================================
//  IPC — USER INFORMATION
//  Account settings sends 'user-data' with {user_name: name, user_alias: alias, user_country: selectedCountry}
//  main saves the data to disk and forwards to mainWindow so it can be
//  send to backend via websocket by renderer
// =============================================================================
ipcMain.on('user-data', (event, data) => {
    // Write data to json (pendent to apply)

    if (mainWindow && !mainWindow.isDestroyed())
        mainWindow.webContents.send('user-data', data)
})




// =============================================================================
//  IPC — WEBSOCKET MESSAGE (from backend) ROUTER
//  Messages arrive from the Python backend via WebSocket → renderer.js
//  forwards them here as 'backend-message'. main then fans them out to
//  whichever windows care about each event type.
// =============================================================================

// Events consumed by the main window (titlebar status + sphere animation)
const mainEvents = [
    'LLM_PROVIDER_NAMES', 'ACTIVE_LLM_PROVIDER', 'ALL_LLM_PROVIDERS_DOWN',
    'TTS_PROVIDER_NAMES', 'ACTIVE_TTS_PROVIDER', 'ALL_TTS_PROVIDERS_DOWN',
    'WW_PROVIDER_NAMES',  'ACTIVE_WW_PROVIDER',  'ALL_WW_PROVIDERS_DOWN',
    'WAKE_DETECTED', 'IDLE'
]

function handleMainMessages(message) {
    if (mainEvents.includes(message.name))
        mainWindow.webContents.send('backend-message', message)
}

// STT_DONE / AI_DONE carry the transcript and AI response shown in chat
function handleChatMessages(message) {
    if ((message.name === 'STT_DONE' || message.name === 'AI_DONE') && chatWindow)
        chatWindow.webContents.send('backend-message', message)
}

ipcMain.on('backend-message', (event, message) => {
    handleMainMessages(message)
    handleChatMessages(message)
})


// =============================================================================
//  APP STARTUP
// =============================================================================
app.whenReady().then(() => {
    // Launch Python backend as a child process
    pythonProcess = spawn('../backend/venv/Scripts/python.exe', ['main.py'], { cwd: '../backend' })
    pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`))
    pythonProcess.stderr.on('data', (data) => console.error(`Python error: ${data}`))

    createMainWindow()
    // createChatWindow()
})