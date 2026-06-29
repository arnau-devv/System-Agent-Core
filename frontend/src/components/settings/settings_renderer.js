// ipcRenderer is only available inside Electron.
// The try/catch lets this file load in a plain browser (e.g. Live Server) without crashing.
let ipcRenderer = null
try { ipcRenderer = require('electron').ipcRenderer } catch (e) {}


// =============================================================================
//  HEADER — close button
// =============================================================================
document.getElementById('close_settings_panel_btn_container').addEventListener('click', () => {
    if (ipcRenderer) ipcRenderer.send('close-settings')
})


// =============================================================================
//  VIEW NAVIGATION
//  Maps each sidebar button ID → the view panel ID it should reveal.
//  Add new entries here whenever a new view is created.
// =============================================================================
const buttons = {
    general_settings_btn:           'view_general',
    customization_settings_btn:     'view_customization',
    notifications_settings_btn:     'view_notifications',
    agent_identity_settings_btn:    'view_agent_identity',
    connections_settings_btn:       'view_connections',
    storage_settings_btn:           'view_storage',
    about_settings_btn:             'view_about',
}

function selectTab(btnId) {
    document.querySelectorAll('.general_settings_panel_options > button').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.settings_view').forEach(v => v.classList.remove('active'))
    document.getElementById(btnId).classList.add('active')
    document.getElementById(buttons[btnId]).classList.add('active')
    
    if (window.resizeBgCanvas) window.resizeBgCanvas()
    if (btnId === 'agent_identity_settings_btn' && window.initAgentIdentity) window.initAgentIdentity()
}

Object.keys(buttons).forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', () => selectTab(btnId))
})

// Edit button → opens account view without marking any nav button as active
document.getElementById('account_settings_edit_btn').addEventListener('click', () => {
    document.querySelectorAll('.general_settings_panel_options > button').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.settings_view').forEach(v => v.classList.remove('active'))
    document.getElementById('view_account').classList.add('active')
    if (window.resizeBgCanvas) window.resizeBgCanvas()
    if (window.initAccountSettings) window.initAccountSettings()
    if (window.initCountryDropdown) window.initCountryDropdown()
})

// Default tab on open
selectTab('customization_settings_btn')