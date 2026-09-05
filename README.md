# OpenCode Voice Plugin (`opencode-voice`)

🎙 **Speak your coding instructions directly into OpenCode.**

`opencode-voice` is a native voice-input plugin for OpenCode. It streams live audio from your microphone to Deepgram's Nova-2 Speech-to-Text API, displaying interim transcription toasts in real time, and appends the final text directly into your OpenCode prompt editor when you release the hotkey.

---

## 📸 Overview

```text
User holds Hotkey (Ctrl+Space)
      │
      ├── 🎙 Recorder captures PCM audio from microphone (via sox)
      ├── ⚡ Streams live audio chunks to Deepgram WebSocket
      ├── 💬 Shows real-time interim transcription toast in TUI
      │
User releases Hotkey
      │
      ├── 🛑 Recorder stops & requests finalization from Deepgram
      └── 📝 Final transcript appended to OpenCode prompt input
```

---

## 🚀 Prerequisites

1. **Bun runtime** (version 1.0+) installed on your machine.
2. **`sox` (Sound eXchange)** installed for microphone recording:
   ```bash
   # macOS
   brew install sox

   # Ubuntu / Debian
   sudo apt-get update && sudo apt-get install -y sox libsox-fmt-all
   ```
3. **Deepgram API Key**:
   - Sign up for a free key at [deepgram.com](https://deepgram.com).
   - Set the environment variable:
     ```bash
     export DEEPGRAM_API_KEY="your-deepgram-api-key"
     ```
4. **Permissions for Global Hotkeys**:
   - **macOS**: Go to `System Settings -> Privacy & Security -> Accessibility` and grant permission to your terminal / IDE application.
   - **Ubuntu / Linux**: Ensure your user account has access to input devices:
     ```bash
     sudo usermod -aG input $USER
     ```
     *(Note: log out and log back in for group changes to take effect).*

---

## 📥 Installation & Setup

OpenCode can resolve plugins from **npm**, a **local file path**, or **GitHub**:

### Option A: Published npm package (default)
```json
{
  "plugin": ["opencode-voice"]
}
```
*OpenCode downloads `opencode-voice` from the npm registry.*

### Option B: Local development / testing
```json
{
  "plugin": ["./path/to/opencode-voice"]
}
```
*OpenCode loads the plugin directly from your local directory.*

### Option C: Directly from GitHub
```json
{
  "plugin": ["github:your-username/opencode-voice"]
}
```
*OpenCode fetches the repository directly from GitHub.*

---

## ⌨️ How to Use

### 1. Slash Command (`/voice`)
Simply type **`/voice`** in OpenCode:
- **First `/voice`**: Starts recording (listening to your microphone).
- **Second `/voice`**: Stops recording, transcribes your speech, and appends the final text to your OpenCode prompt editor.

### 2. Hotkey Push-to-Talk (Optional)
- **Hold `ctrl+space`**: Start speaking your prompt.
- **Release `ctrl+space`**: Recording stops, transcript finalizes and inserts into your prompt window.

### Speech-to-Text Providers

`opencode-voice` supports both **Cloud STT (Deepgram)** and **Local Offline STT (Whisper.cpp)**:

#### Option 1: Deepgram (Cloud STT — Default)
Set your Deepgram API Key:
```bash
export DEEPGRAM_API_KEY="your-deepgram-api-key"
```

#### Option 2: Whisper.cpp (Local Offline STT)
1. Install `whisper-cpp`:
```bash
# macOS
brew install whisper-cpp

# Ubuntu / Linux
# Install whisper.cpp from package manager or build from https://github.com/ggerganov/whisper.cpp
```

2. Download a GGML model file (e.g. `ggml-base.en.bin` ~140 MB):
```bash
mkdir -p ~/.config/opencode/models
curl -L -o ~/.config/opencode/models/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
```

3. Configure environment variables:
```bash
export VOICE_STT_PROVIDER="whispercpp"
export WHISPER_PATH="whisper-cli"
export WHISPER_MODEL_PATH="$HOME/.config/opencode/models/ggml-base.en.bin"
```

### Configuration Options

| Environment Variable | Default | Description |
| -------------------- | ------- | ----------- |
| `VOICE_STT_PROVIDER` | `deepgram` | STT Provider: `deepgram` or `whispercpp` |
| `DEEPGRAM_API_KEY` | *(required for deepgram)* | Deepgram API key |
| `WHISPER_PATH` | `whisper-cli` | Path to `whisper-cli` binary |
| `WHISPER_MODEL_PATH` | `models/ggml-base.en.bin` | Path to GGML model file |
| `VOICE_ENABLED` | `true` | Enable/disable the voice plugin |
| `VOICE_MODE` | `push-to-talk` | Mode: `push-to-talk` or `toggle` |
| `VOICE_HOTKEY` | `ctrl+space` | Hotkey combo (e.g. `ctrl+shift+v`, `cmd+shift+s`) |
| `VOICE_AUTO_SUBMIT` | `false` | If `true`, automatically submits prompt on finalization |
| `VOICE_STT_MODEL` | `nova-3` | Model identifier (`nova-3`, `ggml-base.en.bin`, etc.) |
| `VOICE_STT_LANGUAGE`| `en` | STT language code (e.g., `en`, `es`, `fr`, `de`) |

---

## 🧪 Running Tests & Type Checking

Run unit test suite (63 tests):
```bash
bun test
```

Run TypeScript strict type check:
```bash
bun x tsc --noEmit
```

Build production bundle:
```bash
bun run build
```

---

## 🏗 Architecture

- **`src/stt/`**: STT abstraction layer and Deepgram provider implementation.
- **`src/voice/`**: Audio recorder (`sox`), bounded audio buffer, and state machine (`VoiceController`).
- **`src/hotkey/`**: Global hotkey detection & debouncing.
- **`src/opencode/`**: OpenCode prompt adapter & structured logging.
- **`src/ui/`**: Transcript aggregator (using replacement model to prevent duplication) & toast renderer.

---

## 📄 License

MIT
