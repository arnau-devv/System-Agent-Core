// =============================================================================
//  CHAT — components/chat/chat_renderer.js
//  Handles chat module UI: open/close toggle, sidebar, message rendering,
//  and text input auto-resize.
//  Depends on: openedModuleNavbarBehavior, closeAppBtn
//              (declared in renderer.js).
// =============================================================================


// =============================================================================
//  SPHERE ADAPTATION
//  Grabs the sphere wrapper so the chat module can push it into chat_mode,
//  resizing and repositioning it when the chat opens or closes.
// =============================================================================
const sphereWrapper = document.getElementById('sphere_wrapper')

const chatView      = document.getElementById('chat_main_view')
const toggleChatBtn = document.getElementById('toggle_chat_btn')

// Toggles the chat module open/closed, syncs the close button margin,
// repositions the sphere, and updates the navbar open state.
toggleChatBtn.addEventListener('click', () => {
    chatView.classList.toggle('module_opened')
    closeAppBtn.classList.toggle('apply_margin')
    sphereApplyChatMode()
    openedModuleNavbarBehavior()
})
// chatView.classList.add('module_opened')


// =============================================================================
//  SIDEBAR TOGGLE
//  Listens for the checkbox change and adds/removes the 'opened' class on the
//  sidebar container, which drives the width transition in CSS.
// =============================================================================
const chatSidebarToggleCheckbox = document.getElementById('sidebar_toggle_checkbox')
const chatSidebar = document.getElementById('chat_sidebar_container')

chatSidebarToggleCheckbox.addEventListener('change', () => {
    if (chatSidebarToggleCheckbox.checked) chatSidebar.classList.add('opened')
    else chatSidebar.classList.remove('opened')

    console.log('sidebar:', chatSidebarToggleCheckbox.checked ? 'open' : 'closed')
})

// Adds or removes 'chat_mode' on the sphere wrapper depending on whether
// the chat module is currently open.
function sphereApplyChatMode() {
    if (chatView.classList.contains('module_opened')) 
        sphereWrapper.classList.add('chat_mode')
    else sphereWrapper.classList.remove('chat_mode')
}


// =============================================================================
//  MESSAGE STORE
//  Accumulates every incoming chat message for the lifetime of the session.
//  Each entry holds the event name, sender role, and text content.
//  handleMessage() is called from renderer.js whenever a CHAT_MESSAGE
//  event arrives from the backend.
// =============================================================================
const messageStore = []

function handleMessage(message) {
    const entry = {
        name: message.name,
        role: message.data.role,
        text: message.data.content,
    }
    messageStore.push(entry)
    renderMessages()
}


// =============================================================================
//  CHAT RENDERING
//  Reads the latest entry from the store and appends it to the DOM.
//  Each message animates in from a slight downward offset.
//  Text is set via textContent (not innerHTML) to avoid unintended
//  interpretation of HTML or markdown in the message body.
// =============================================================================
const chatMessages = document.getElementById('chat_messages')
const USER_AVATAR_SRC = '../assets/images/pfp_example.png'

function renderMessages() {
    const entry = messageStore[messageStore.length - 1]
    const isAgent = entry.role === 'assistant'
    const roleClass = isAgent ? 'agent' : 'user'
    const label = isAgent ? 'assistant' : 'user'

    const div = document.createElement('div')
    div.classList.add('chat_message', roleClass)

    const avatarHTML = isAgent
        ? ``
        : `<div class="chat_avatar"><img src="${USER_AVATAR_SRC}" alt=""></div>`

    div.innerHTML = `
        ${avatarHTML}
        <div class="chat_message_column">
            <h3>${label}</h3>
            <p></p>
        </div>
    `
    div.querySelector('p').textContent = entry.text

    div.style.opacity = '0'
    div.style.transform = 'translateY(10px)'
    div.style.transition = 'opacity 0.3s ease, transform 0.3s ease'

    chatMessages.appendChild(div)

    div.offsetHeight

    div.style.opacity = '1'
    div.style.transform = 'translateY(0)'

    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' })
}


// =============================================================================
//  TEXT INPUT
//  Auto-resizes the textarea as the user types. Height grows upward until it
//  reaches the 250px cap, at which point vertical scrolling is enabled.
// =============================================================================
const chatField = document.getElementById('chatField')

chatField.addEventListener('input', () => {
    chatField.style.height = 'auto'
    if (chatField.scrollHeight > 250) {
        chatField.style.height = '250px'
        chatField.style.overflowY = 'scroll'
    } else {
        chatField.style.height = chatField.scrollHeight + 'px'
        chatField.style.overflowY = 'hidden'
    }
})