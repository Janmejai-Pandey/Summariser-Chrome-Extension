import React, { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import "./Popup.css"

const Popup = () => {
  const [type, setType] = useState("unread")
  const [customLimit, setCustomLimit] = useState(20)
  const [summary, setSummary] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [chatMeta, setChatMeta] = useState(null)


  useEffect(() => {
    loadChatMetadata()
  }, [])

  useEffect(() => {
    const listener = (changes, area) => {
      if (area === "local" && changes.chatState) {
        loadChatMetadata()
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])


  const loadChatMetadata = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.url?.includes("web.whatsapp.com")) return

    chrome.tabs.sendMessage(tab.id, { action: "getCurrentChatName" }, async (response) => {
      if (!response?.chatName) return
      const { chatState = {} } = await chrome.storage.local.get("chatState")
      setChatMeta({
        chatName: response.chatName,
        ...(chatState[response.chatName] || {})
      })
    })
  }


  const handleSummarise = () => {
    setLoading(true)
    setError(null)
    setSummary("")

    chrome.runtime.sendMessage(
      {
        action: "summarise",
        type,
        limit: type === "custom" ? customLimit : undefined
      },
      (response) => {
        if (response?.error) {
          setError(response.error)
        } else if (response?.summary) {
          setSummary(response.summary)
        }
        setLoading(false)
      }
    )
  }

  return (
    <div>
      <div id="popup-title">WhatsApp Summariser</div>

      {chatMeta && (
        <div style={{
          margin: "1rem",
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "6px",
          fontSize: "12px",
          backgroundColor: "#101310"
        }}>
          <div><strong>Chat:</strong> {chatMeta.chatName}</div>
          <div><strong>Unread:</strong> {chatMeta.unreadCount ?? 0}</div>
          <div><strong>Divider:</strong> {chatMeta.hasUnreadDivider ? "Yes" : "No"}</div>
          <div><strong>Updated:</strong> {chatMeta.lastUpdated ?? "-"}</div>
        </div>
      )}

      <div className="labels">
        <label>
          <input type="radio" value="unread" checked={type === "unread"} onChange={(e) => setType(e.target.value)} />
          Unread only
        </label>

        <div id="custom">
          <label>
            <input type="radio" value="custom" checked={type === "custom"} onChange={(e) => setType(e.target.value)} />
            Custom
          </label>
          {type === "custom" && (
            <input type="number" value={customLimit} onChange={(e) => setCustomLimit(Number(e.target.value))} />
          )}
        </div>

        <label>
          <input type="radio" value="all" checked={type === "all"} onChange={(e) => setType(e.target.value)} />
          All messages
        </label>

        <button onClick={handleSummarise} disabled={loading}>
          {loading ? "Loading..." : "Summarise"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {summary && (
        <div className="summary">
          <h3>Summary</h3>
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export default Popup