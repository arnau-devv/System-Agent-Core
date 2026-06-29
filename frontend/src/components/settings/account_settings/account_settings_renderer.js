// =============================================================================
//  ACCOUNT SETTINGS — account_settings/account_settings_renderer.js
//  All logic for the account view.
//  Depends on: ipcRenderer (declared in settings_renderer.js),
//              BG_THEMES and initGrainyBg (loaded previously in settings.html).
// =============================================================================


// =============================================================================
//  BACKGROUND BANNER
//  The account view header has its own grainy-bg (not fullscreen).
//  It synchronizes with the global theme upon opening and in real-time via IPC.
// =============================================================================
let accountHeaderInstance = null

function initAccountSettings() {
    if (accountHeaderInstance) {
        accountHeaderInstance.resize()
        return
    }

    accountHeaderInstance = window.initGrainyBg({
        target:    document.querySelector('.account_settings_header'),
        speed:     2.3,
        intensity: 0.112,
        grainSize: 1.9,
        amplitude: 0.1,
    })

    if (ipcRenderer) {
        ipcRenderer.invoke('get-background').then((bg) => {
            const theme = bg?.theme ?? window.DEFAULT_BG_THEME
            const mode  = bg?.mode  ?? window.DEFAULT_BG_MODE
            accountHeaderInstance.setColors(window.BG_THEMES[theme][mode])
        })
    }
}

if (ipcRenderer) {
    ipcRenderer.on('background-changed', (event, data) => {
        if (accountHeaderInstance && data?.colors) accountHeaderInstance.setColors(data.colors)
    })
}

window.initAccountSettings = initAccountSettings


// =============================================================================
//  COUNTRY DROPDOWN
// =============================================================================
const dropdown      = document.getElementById('country_dropdown')
const selectedLabel = document.getElementById('country_label')
const selectedFlag  = document.getElementById('country_flag')
const countrySelectedEl = document.getElementById('country_selected')

let selectedCountry = null

dropdown.addEventListener('click', (e) => {
    dropdown.classList.toggle('open')
    e.stopPropagation()
})

function initCountryDropdown() {
    document.querySelectorAll('.country_option').forEach(option => {
        option.addEventListener('click', (e) => {
            selectedCountry  = option.dataset.flag //data-value -> ['es', 'fr', 'us', etc...]
            const label = option.textContent.trim() //Country Name -> ['Spain', 'France', etc...]
            //Flag (class > fi fi-[..])
            const spanElement = option.querySelector('span');
            const flagClassName = spanElement.className;

            selectedFlag.className        = flagClassName
            selectedLabel.textContent       = label
            countrySelectedEl.classList.add('has_value')

            document.querySelectorAll('.country_option').forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')

            dropdown.classList.remove('open')
            e.stopPropagation()
        })
    })

    document.addEventListener('click', () => dropdown.classList.remove('open'))
}

window.initCountryDropdown = initCountryDropdown


// =============================================================================
//  USER INFORMATION Logic
// Toggles the Save button's disabled/enabled state.
// Relays data to renderer.js, which then emits it to the backend over 
// a WebSocket connection.
// =============================================================================
const saveUserData = document.getElementById('account_settings_save_btn')

saveUserData.addEventListener('click', () => {
    const name  = document.getElementById('name_input').value.trim()
    const alias = document.querySelector('.input_suffix').value.trim()
    if (ipcRenderer) ipcRenderer.send('user-data', { user_name: name, user_alias: alias, user_country: selectedCountry })
})