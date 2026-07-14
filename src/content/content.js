function extractWhatsAppMessages() {
  const messageNodes = document.querySelectorAll('[data-testid="msg-container"]')
  const messages = []
  let lastSender = { name: null, phone: null }

  messageNodes.forEach(msg => {
    const copyable = msg.querySelector(".copyable-text")
    const prePlainText = copyable?.dataset.prePlainText || ""

    const phoneMatch = prePlainText.match(/\]\s(.+?):\s*$/)
    const phone = phoneMatch ? phoneMatch[1].trim() : null

    const authorElement = msg.querySelector('[data-testid="author"]')
    const name = authorElement?.innerText.trim() || null

    if (name || phone) {
      lastSender = {
        name: name || lastSender.name,
        phone: phone || lastSender.phone
      }
    }

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

function getUnreadCount() {
  const unreadContainer = document.querySelector('span[aria-live="polite"]')
  if (!unreadContainer) return null
  return parseInt(unreadContainer.innerText, 10) || 0
}

function getCurrentChatName() {
  const header = document.querySelector("span[data-testid='conversation-info-header-chat-title']")
  return header ? header.innerText.trim() : "Unknown Chat"
}

async function updateUnreadState() {
  const unreadCount = getUnreadCount()
  const currentChat = getCurrentChatName()

  const { chatState = {} } = await chrome.storage.local.get("chatState")
  const previous = chatState[currentChat] || {}

  chatState[currentChat] = {
    unreadCount: unreadCount !== null ? unreadCount : (previous.unreadCount || 0),
    hasUnreadDivider: unreadCount !== null,
    lastUpdated: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "medium"
    })
  }

  await chrome.storage.local.set({ chatState })
}

let previousUnreadCount = undefined

const unreadObserver = new MutationObserver(() => {
  const currentUnreadCount = getUnreadCount()
  if (currentUnreadCount !== previousUnreadCount) {
    previousUnreadCount = currentUnreadCount
    updateUnreadState()
  }
})

unreadObserver.observe(document.body, { childList: true, subtree: true })

updateUnreadState()

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "getCurrentChatName") {
    sendResponse({ chatName: getCurrentChatName() })
  }

  if (request.action === "getChats") {
    const allMessages = extractWhatsAppMessages()
    let limit

    if (request.type === "unread" || request.type === "custom") {
      limit = request.limit
    } else {
      limit = allMessages.length
    }

    const chat = allMessages.slice(-limit)
    sendResponse({ messages: chat, totalMessages: allMessages.length })
  }
  return true
})