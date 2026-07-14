# WhatsApp Chat Summariser

A Chrome extension that summarises your WhatsApp Web conversations using AI.

---

## Features

- Summarise unread messages automatically
- Choose a custom number of recent messages to summarise
- Summarise entire chat history
- Tracks unread count per chat in real-time
- Powered by Groq (fast and free)

---

## Tech Stack

- React (Vite)
- Chrome Extension Manifest V3
- Groq API
- CRXJS Vite Plugin

---

## Installation

You can install the extension in two ways: directly from a release (no build required), or by building from source.

### Option 1 — Install From Release (Recommended)

1. Go to the [Releases](../../releases) page
2. Download the latest release zip file
3. Extract the zip to a folder on your computer
4. Open Chrome and go to `chrome://extensions`
5. Enable **Developer mode** (toggle in the top-right corner)
6. Click **Load unpacked**
7. Select the extracted folder
8. The extension icon will appear in your Chrome toolbar

> **Note:** You still need to add your own Groq API key. See [Adding Your API Key](#adding-your-api-key) below.

### Option 2 — Build From Source

#### Prerequisites

- Node.js (v16 or higher)
- npm
- Google Chrome
- A Groq API key

#### Steps

1. Clone the repository
   ```bash
   git clone <your-repo-url>
   cd <project-folder>
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the extension
   ```bash
   npm run build
   ```

4. Open Chrome and go to `chrome://extensions`
5. Enable **Developer mode**
6. Click **Load unpacked**
7. Select the `dist` folder from your project

---

## Adding Your API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to the **API Keys** section
4. Click **Create API Key**
5. Copy the generated key

### If You Built From Source

Create a `.env` file in the project root and add:

```
VITE_GROQ_API_KEY=your_groq_key_here
```

Make sure `.env` is listed in `.gitignore`, then run `npm run build` again.

### If You Installed From Release

Open `background.js` inside the extracted folder and replace the placeholder:

```javascript
const GROQ_API_KEY = "your_groq_key_here"
```

Then reload the extension from `chrome://extensions`.

---

## Usage

1. Open [WhatsApp Web](https://web.whatsapp.com) and log in
2. Open any chat you want to summarise
3. Click the extension icon in your Chrome toolbar
4. Choose an option:
   - **Unread only** — summarises only unread messages
   - **Custom** — enter the number of recent messages
   - **All messages** — summarises the entire visible chat
5. Click **Summarise**

---

## Updating the Extension

### From Release
- Download the latest release and replace the old folder
- Click the **refresh icon** on the extension card in `chrome://extensions`

### From Source
- Run `npm run build`
- Click the **refresh icon** on the extension card in `chrome://extensions`

---

## Project Structure

```
├── src/
│   ├── popup/
│   │   ├── Popup.jsx
│   │   └── Popup.css
│   ├── content/
│   │   └── content.js
│   └── background/
│       └── background.js
├── manifest.json
├── vite.config.js
└── package.json
```

---

## Troubleshooting

**Extension doesn't work on WhatsApp**
- Make sure you're on `web.whatsapp.com`
- Reload the page after installing the extension

**"No unread messages found"**
- The unread divider must be visible in the chat
- Use "Custom" option instead

**"API call failed"**
- Verify your Groq API key is correct
- Check usage limits at [console.groq.com](https://console.groq.com)

---

## License

MIT