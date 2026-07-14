// =============================================
// Extracts all visible messages from WhatsApp
// =============================================
function extractWhatsAppMessages() {
  const messageNodes = document.querySelectorAll('[data-testid="msg-container"]')
  const messages = []
  // Track last known sender since WhatsApp doesn't repeat sender info for consecutive messages
  let lastSender = { name: null, phone: null }

  messageNodes.forEach(msg => {
    // copyable-text contains sender phone and timestamp in data-pre-plain-text
    const copyable = msg.querySelector(".copyable-text")
    const prePlainText = copyable?.dataset.prePlainText || ""

    // Extract phone number from format: [time] phone: 
    const phoneMatch = prePlainText.match(/\]\s(.+?):\s*$/)
    const phone = phoneMatch ? phoneMatch[1].trim() : null

    // Name is shown for group chats
    const authorElement = msg.querySelector('[data-testid="author"]')
    const name = authorElement?.innerText.trim() || null

    // Update last sender only if new sender info is found
    if (name || phone) {
      lastSender = {
        name: name || lastSender.name,
        phone: phone || lastSender.phone
      }
    }

    // =============================================
    // Handle replied messages
    // =============================================
    let replyTo = null
    const quoted = msg.querySelector('[data-testid="quoted-message"]')

    if (quoted) {
      const quotedAuthor = quoted.querySelector('[data-testid="author"]')?.innerText.trim() || null
      const quotedPhone = quoted.querySelector('span[testid="author"]')?.innerText.trim() || null
      const quotedText = quoted.querySelector('[data-testid="selectable-text"]')?.innerText.trim() || ""

      replyTo = {
        sender: { name: quotedAuthor, phone: quotedPhone },
        text: quotedText
      }
    }

    // =============================================
    // Extract message text
    // If reply exists, actual message is the last selectable text
    // Otherwise it's the first one
    // =============================================
    const selectableTexts = [...msg.querySelectorAll('[data-testid="selectable-text"]')]
    let text = ""

    if (replyTo) {
      if (selectableTexts.length >= 2) {
        text = selectableTexts[selectableTexts.length - 1].innerText.trim()
      }
    } else {
      if (selectableTexts.length) {
        text = selectableTexts[0].innerText.trim()
      }
    }

    // Skip empty bubbles (media messages with no text)
    if (!text && !replyTo) return

    messages.push({
      sender: { name: lastSender.name, phone: lastSender.phone },
      timestamp: prePlainText,
      text,
      replyTo
    })
  })

  return messages
}

// =============================================
// Returns unread count if divider exists
// Returns null if no unread divider found
// =============================================
function getUnreadCount() {
  const unreadContainer = document.querySelector('span[aria-live="polite"]')
  if (!unreadContainer) return null
  return parseInt(unreadContainer.innerText, 10) || 0
}

// =============================================
// Returns the name of currently opened chat
// =============================================
function getCurrentChatName() {
  const header = document.querySelector("span[data-testid='conversation-info-header-chat-title']")
  return header ? header.innerText.trim() : "Unknown Chat"
}

// =============================================
// Saves unread count + metadata to local storage
// Called on load and whenever unread count changes
// =============================================
async function updateUnreadState() {
  const unreadCount = getUnreadCount()
  const currentChat = getCurrentChatName()

  // Get existing state so we dont overwrite other chats
  const { chatState = {} } = await chrome.storage.local.get("chatState")
  const previous = chatState[currentChat] || {}

  chatState[currentChat] = {
    // Keep previous count if divider is gone (user scrolled past it)
    unreadCount: unreadCount !== null ? unreadCount : (previous.unreadCount || 0),
    hasUnreadDivider: unreadCount !== null,
    lastUpdated: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium"
    })
  }

  await chrome.storage.local.set({ chatState })
}

// =============================================
// Watch DOM for changes in unread divider
// Only calls updateUnreadState when count changes
// =============================================
let previousUnreadCount = undefined

const unreadObserver = new MutationObserver(() => {
  const currentUnreadCount = getUnreadCount()
  if (currentUnreadCount !== previousUnreadCount) {
    previousUnreadCount = currentUnreadCount
    updateUnreadState()
  }
})

// Observe entire body since WhatsApp is a SPA and DOM changes frequently
unreadObserver.observe(document.body, { childList: true, subtree: true })

// Run once on script load
updateUnreadState()

// =============================================
// Listen for messages from popup and background
// =============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // Background needs chat name to look up stored unread count
  if (request.action === "getCurrentChatName") {
    sendResponse({ chatName: getCurrentChatName() })
  }

  // Background requests messages with a specific type and limit
  if (request.action === "getChats") {
    const allMessages = extractWhatsAppMessages()
    let limit

    // For unread and custom, limit is calculated by background and sent here
    if (request.type === "unread" || request.type === "custom") {
      limit = request.limit
    } else {
      // All messages
      limit = allMessages.length
    }

    const chat = allMessages.slice(-limit)
    sendResponse({ messages: chat, totalMessages: allMessages.length })
  }

  // return true keeps message channel open for async sendResponse
  return true
})