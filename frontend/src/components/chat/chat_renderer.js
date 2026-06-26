
// VERSION WITHOUT HEIGH ADAPTION FOR NAVBAR PUSHING UPWARDS
// const CHAT_BASE_HEIGHT  = 550    // altura natural del chat
// const CHAT_BOTTOM       = 50     // bottom: 50px del CSS
// const SAFETY_MARGIN     = 50     // empieza a encoger cuando quedan 20px de margen
// const SHRINK_THRESHOLD  = CHAT_BASE_HEIGHT + CHAT_BOTTOM + SAFETY_MARGIN  // 620px

// function updateChatSize() {
//     const winHeight = window.innerHeight
//     if (winHeight < SHRINK_THRESHOLD) {
//         // Cuánto espacio disponible hay para el chat
//         const available = winHeight - CHAT_BOTTOM - SAFETY_MARGIN
//         const newHeight = Math.max(available, 100)  // mínimo 100px antes de ocultarlo
//         chatContainer.style.height = newHeight + 'px'
//     } else {
//         chatContainer.style.height = CHAT_BASE_HEIGHT + 'px'
//     }
// }

// window.addEventListener('resize', updateChatSize)
// updateChatSize()  // aplica al cargar por si la ventana ya es pequeña


// =============================================================================
//  CHAT OPENING / CLOSING LOGIC
// =============================================================================
const chatToggleBtn = document.getElementById('open_chat_btn')
const chatContainer = document.getElementById('chat_main_container');

chatToggleBtn.addEventListener('click', () => { chatContainer.classList.toggle('is-open') })



// // =============================================================================
// //  CHAT RESIZE -> WINDOW SIZE ADAPTION
// // =============================================================================
// const CHAT_BASE_HEIGHT  = 550
// const CHAT_BOTTOM       = 50
// const SAFETY_MARGIN     = 50
// const MEDIA_SHIFT       = 50
// const mqShift  = window.matchMedia('(max-width: 1220px)')
// const mqCenter = window.matchMedia('(max-width: 650px)') // mismo breakpoint que el CSS de centrado

// function updateChatSize() {
//     if (mqCenter.matches) {
//         // Por debajo de 750px el CSS ya centra y dimensiona el chat (calc(100vw/vh - 100px)).
//         // Quitamos cualquier altura inline para no pisar esa regla.
//         chatContainer.style.height = ''
//         return
//     }

//     const winHeight = window.innerHeight
//     const effectiveBottom = CHAT_BOTTOM + (mqShift.matches ? MEDIA_SHIFT : 0)
//     const shrinkThreshold = CHAT_BASE_HEIGHT + effectiveBottom + SAFETY_MARGIN

//     if (winHeight < shrinkThreshold) {
//         const available = winHeight - effectiveBottom - SAFETY_MARGIN
//         chatContainer.style.height = Math.max(available, 100) + 'px'
//     } else {
//         chatContainer.style.height = CHAT_BASE_HEIGHT + 'px'
//     }
// }

// window.addEventListener('resize', updateChatSize)
// mqShift.addEventListener('change', updateChatSize)
// mqCenter.addEventListener('change', updateChatSize)
// updateChatSize()