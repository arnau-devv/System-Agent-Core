// =============================================================================
//  CHAT — components/chat/chat_renderer.js
//  All logic for the chat module: open/close toggle and navbar state sync.
//  Depends on: openedModuleNavbarBehavior, closeAppBtn
//              (declared in renderer.js).
// =============================================================================


// -------- SPHERE ADAPTATION -------
const sphereWrapper = document.getElementById('sphere_wrapper')


const chatView      = document.getElementById('chat_main_view')
const toggleChatBtn = document.getElementById('toggle_chat_btn')

// Toggles the chat module open/closed and updates the navbar state accordingly.
toggleChatBtn.addEventListener('click', () => {
    chatView.classList.toggle('module_opened')
    closeAppBtn.classList.toggle('apply_margin')
    sphereApplyChatMode()
    openedModuleNavbarBehavior()
})
// chatView.classList.add('module_opened')


// ------- SIDEBAR TOGGLE --------
const chatSidebarToggleCheckbox = document.getElementById('sidebar_toggle_checkbox')
const chatSidebar = document.getElementById('chat_sidebar_container')

chatSidebarToggleCheckbox.addEventListener('change', () => {
    if (chatSidebarToggleCheckbox.checked) chatSidebar.classList.add('opened')
    else chatSidebar.classList.remove('opened')

    console.log('sidebar:', chatSidebarToggleCheckbox.checked ? 'open' : 'closed')
})

// -------- SPHERE ADAPTATION -------
function sphereApplyChatMode() {
    if (chatView.classList.contains('module_opened')) 
        sphereWrapper.classList.add('chat_mode')
    else sphereWrapper.classList.remove('chat_mode')
}