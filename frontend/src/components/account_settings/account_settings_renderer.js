
// =============================================================================
//  BACKGROUND
//  The header uses its own grainy-bg instance (not fullscreen).
//  It syncs with the global theme on load and in real time via IPC.
// =============================================================================
const accountHeaderInstance = window.initGrainyBg({
    target:    document.querySelector('.account_settings_header'),
    speed:     2.3,
    intensity: 0.112,
    grainSize: 1.9,
    amplitude: 0.1,
})

ipcRenderer.invoke('get-background').then((bg) => {
    const theme  = bg?.theme ?? window.DEFAULT_BG_THEME
    const mode   = bg?.mode  ?? window.DEFAULT_BG_MODE
    accountHeaderInstance.setColors(window.BG_THEMES[theme][mode])  // antes: window.setBgColors(...)
})

ipcRenderer.on('background-changed', (event, data) => {
    if (data?.colors) accountHeaderInstance.setColors(data.colors)  // antes: window.setBgColors(...)
})



// =============================================================================
//  BACKGROUND
//  The header uses its own grainy-bg instance (not fullscreen).
//  It syncs with the global theme on load and in real time via IPC.
// =============================================================================
const dropdown = document.getElementById('country_dropdown')
const selectedLabel = document.getElementById('country_label')
const selectedFlag = document.getElementById('country_flag')
const countrySelected = document.getElementById('country_selected')

dropdown.addEventListener('click', (e) => {
    dropdown.classList.toggle('open')
    e.stopPropagation()
})




// =============================================================================
//  COUNTRY DROPDOWN
// =============================================================================
function initCountryDropdown() {
    document.querySelectorAll('.country_option').forEach(option => {
        option.addEventListener('click', (e) => {
            const flag  = option.dataset.flag
            const label = option.textContent.trim().split(' ').slice(1).join(' ')

            selectedFlag.textContent  = flag
            selectedLabel.textContent = label
            countrySelected.classList.add('has_value')

            document.querySelectorAll('.country_option').forEach(o => o.classList.remove('selected'))
            option.classList.add('selected')

            dropdown.classList.remove('open')
            e.stopPropagation()
        })
    })

    document.addEventListener('click', () => dropdown.classList.remove('open'))
}
window.initCountryDropdown = initCountryDropdown