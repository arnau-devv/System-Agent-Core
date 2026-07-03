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
            const label      = option.textContent.trim() //Country Name -> ['Spain', 'France', etc...]
            selectedCountry  = option.dataset.value  //| data-value -> ['es', 'fr', 'us', etc...]

            //Flag (class > fi fi-[..])
            const spanElement   = option.querySelector('span');
            const flagClassName = spanElement.className;

            selectedFlag.className    = flagClassName
            selectedLabel.textContent = label
            countrySelectedEl.classList.add('has_value')

            document.querySelectorAll('.country_option').forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')

            dropdown.classList.remove('open')
            e.stopPropagation()

            checkUserDirtyInputs('country', selectedCountry)
        })
    })

    document.addEventListener('click', () => dropdown.classList.remove('open'))
}

window.initCountryDropdown = initCountryDropdown



// =============================================================================
//  BUTTON ACTIVATION & IPC (user-data)
//  Tracks which inputs have been modified since last save.
//  Enables the Save button only when there are pending changes.
//  On save, relays data to renderer.js → WebSocket → backend.
// =============================================================================
const saveUserData = document.getElementById('account_settings_save_btn')
// Activate Button Helper (visual)
function setSaveUserButtonDisabledStyle (isDisabled) {
    if (isDisabled) saveUserData.classList.add('disabled')
    else saveUserData.classList.remove('disabled')
}

saveUserData.disabled = true
setSaveUserButtonDisabledStyle(true)

const trackedUserInputs = {
    name:  document.getElementById('name_input'),
    alias: document.querySelector('.input_suffix')
}

// DOM references to each input's parent container (for the save animation)
const userInputContainers = {
    name:    document.querySelector('.name_textarea_div'),
    alias:   document.querySelector('.input_with_prefix'),
    country: document.querySelector('.country_select_div'),
}
// Snapshot of values at load time
// pendant -> apply data persistance
const originalUserValues = {
    name:    document.getElementById('name_input').value.trim(),
    alias:   document.querySelector('.input_suffix').value.trim(),
    country: null 
}
const dirtyUserDataFields    = new Set()  // Keys of inputs that differ from their original value

// Checks if a given key has changed from its original value and updates dirtyFields
function checkUserDirtyInputs(key, currentValue) {
    const changed = currentValue !== originalUserValues[key]
    if (changed) dirtyUserDataFields.add(key)
    else dirtyUserDataFields.delete(key)

    let isDisabled = dirtyUserDataFields.size === 0;
    saveUserData.disabled = isDisabled;
    setSaveUserButtonDisabledStyle(isDisabled);
}

Object.entries(trackedUserInputs).forEach(([key, input]) => {
    originalUserValues[key] = input.value.trim()
})

// Changes detection
Object.entries(trackedUserInputs).forEach(([key, input]) => {
    input.addEventListener('input', () => {
        checkUserDirtyInputs(key, input.value.trim())
    })
})

function triggerSavePulse(container) {
    if (!container) return
    container.classList.add('save_pulse')
    container.addEventListener('animationend', () => container.classList.remove('save_pulse'), { once: true })
}

saveUserData.addEventListener('click', () => {
    if (dirtyUserDataFields.size === 0) return

    dirtyUserDataFields.forEach(key => {
        // Update snapshot — inputs use .value, country uses selectedCountry
        if (key === 'country') originalUserValues.country = selectedCountry
        else originalUserValues[key] = trackedUserInputs[key].value.trim()

        triggerSavePulse(userInputContainers[key])
    })

    dirtyUserDataFields.clear()
    saveUserData.disabled = true
    setSaveUserButtonDisabledStyle(true)

    const name  = trackedUserInputs.name.value.trim()
    const alias = trackedUserInputs.alias.value.trim()
    if (ipcRenderer) ipcRenderer.send('user-data', { user_name: name, user_alias: alias, user_country: selectedCountry })
})

// =============================================================================
// DATA INIT
// =============================================================================
// user data reciebed as -> { "user_name": "", "user_alias": "", "user_country": "" }
function applyUserData(data) {
    if (!data || Object.keys(data).length === 0) return

    if (data.user_name) {
        trackedUserInputs.name.value = data.user_name
        originalUserValues.name      = data.user_name
    }
    if (data.user_alias) {
        trackedUserInputs.alias.value = data.user_alias
        originalUserValues.alias        = data.user_alias
    }

    if (data.user_country) {
        const option = document.querySelector(`.country_option[data-value="${data.user_country}"]`)
        if (option) {
            const span = option.querySelector('span')
            selectedFlag.className     = span.className
            selectedLabel.textContent  = option.textContent.trim()
            countrySelectedEl.classList.add('has_value')
            document.querySelectorAll('.country_option').forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')
            selectedCountry            = data.user_country
            originalUserValues.country = data.user_country
        }
    }
}

window.applyUserData = applyUserData