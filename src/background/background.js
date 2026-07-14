const GROQ_API_KEY = process.env.GROQ_API_KEY

const formatMessages = (messages) => {
  return messages.map(msg => {
    const sender = msg.sender.name || msg.sender.phone || "Unknown"
    return `${sender}: ${msg.text}`
  }).join("\n")
}

const summariseWithGroq = async (messages) => {
  const chatText = formatMessages(messages)

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarises WhatsApp conversations clearly and concisely."
          },
          {
            role: "user",
            content: `Summarise this WhatsApp conversation:\n\n${chatText}`
          }
        ]
      })
    }
  )

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  return data.choices[0].message.content
}

const handleSummarise = async (request, sendResponse) => {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab.url?.includes("web.whatsapp.com")) {
    sendResponse({ error: "Please open WhatsApp Web first" })
    return
  }

  const chatInfo = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { action: "getCurrentChatName" }, (res) => resolve(res))
  })

  let limit = request.limit

  if (request.type === "unread") {
    const { chatState = {} } = await chrome.storage.local.get("chatState")
    const unreadCount = chatState[chatInfo?.chatName]?.unreadCount

    if (!unreadCount) {
      sendResponse({ error: "No unread messages found" })
      return
    }

    limit = unreadCount
  }

  const chatResponse = await new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tab.id,
      { action: "getChats", type: request.type, limit },
      (res) => resolve(res)
    )
  })

  if (!chatResponse?.messages?.length) {
    sendResponse({ error: "No messages found" })
    return
  }

  try {
    const summary = await summariseWithGroq(chatResponse.messages)
    sendResponse({ summary })
  } catch (err) {
    sendResponse({ error: "API call failed: " + err.message })
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarise") {
    handleSummarise(request, sendResponse)
  }
  return true
})