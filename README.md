# OpenCode Voice Plugin (`opencode-voice`)

Speak your coding instructions directly into OpenCode.

`opencode-voice` is a voice-input plugin for OpenCode. It captures audio from your microphone, transcribes it locally with Whisper.cpp (no API key, no cloud), and inserts the transcript into your prompt.

---

## Quick Setup (Agent Instructions)

Run these commands to set up the voice plugin end-to-end:

### Step 1: Install Prerequisites

```bash
# macOS
brew install sox whisper-cpp

# Ubuntu / Debian
sudo apt-get update && sudo apt-get install -y sox libsox-fmt-all
# Install whisper.cpp from https://github.com/ggerganov/whisper.cpp
# (build it and put `whisper-cli` on your PATH, or point WHISPER_PATH at it)
```

On Linux, if sox is not installed the plugin falls back to `arecord` (from `alsa-utils`).

### Step 2: Download Whisper Model

```bash
mkdir -p ~/.config/opencode/models
curl -L -o ~/.config/opencode/models/ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
```

### Step 3: Set Environment Variables

Add these to your shell profile (`~/.zshrc`, `~/.bashrc`, or `~/.profile`):

```bash
# Voice plugin - local Whisper (no API key needed)
export WHISPER_PATH="whisper-cli"
export WHISPER_MODEL_PATH="$HOME/.config/opencode/models/ggml-base.en.bin"
```

Then reload your shell:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

### Step 4: Configure OpenCode Plugin

Add to your `~/.config/opencode/opencode.json` (global) or `.opencode/opencode.json` (project):

```json
{
  "plugin": ["github:sandeepkhore/opencode-voice#main"]
}
```

### Step 5: Grant Permissions

**macOS:** Go to **System Settings > Privacy & Security > Accessibility** and grant permission to your terminal application.

**Linux (X11 and Wayland):** The global hotkey reads keyboard events from `/dev/input`, so your user must be in the `input` group:

```bash
sudo usermod -aG input $USER
# Log out and back in (or reboot) for the group change to take effect
groups | grep -w input   # verify
```

On an X11 session without `input` group access, the plugin falls back to an X11 key listener. Wayland sessions (the Ubuntu default) require the `input` group.

> Note: membership in the `input` group lets your user's programs read all keyboard input. The plugin only checks for the configured hotkey and does not record or store keystrokes.

### Step 6: Restart OpenCode

```bash
opencode
```

Hold `Ctrl` to speak, release to transcribe.

---

## Installation Options

### From GitHub (recommended)
```json
{
  "plugin": ["github:sandeepkhore/opencode-voice#main"]
}
```

### From npm (when published)
```json
{
  "plugin": ["opencode-voice"]
}
```

### Local development

On OpenCode v1 the `plugin` array only accepts npm specs — `file://` or
`@file://` entries fail with `Could not read package.json`. Load a local
checkout via a one-line shim in the global plugins directory instead:

```bash
cat > ~/.config/opencode/plugins/opencode-voice-local.ts <<'EOF'
// ponytail: shim to local dev copy; swap for npm spec when published
export { default, VoiceInputPlugin } from "/absolute/path/to/opencode-voice/src/index.ts";
EOF
```

- Use the full absolute path (no `~`, no relative paths).
- Point at the entry file (`src/index.ts`), not the folder. Deps resolve
  from the checkout's own `node_modules` (run `npm install` there first),
  so no build step is needed and edits take effect after restarting OpenCode.
- Do NOT add anything to the `plugin` array for this — files under
  `~/.config/opencode/plugins/` autoload at startup.
- Example: `/home/<user>/projects/opencode-voice/src/index.ts`

---

## Usage

### Push-to-Talk
- **Hold `Ctrl`**: Start speaking (recording begins after holding for ~0.4s)
- **Release `Ctrl`**: Transcript inserts into prompt

Regular shortcuts are ignored: tapping `Ctrl` or pressing any other key while holding it (`Ctrl+C`, `Ctrl+V`…) never starts a recording, and cancels one already in progress. Recordings shorter than 0.5s and transcripts containing only noise tags such as `(air whooshing)` or `[BLANK_AUDIO]` are discarded.

---

## Speech-to-Text

Whisper.cpp (local, offline — the only provider). Requires: `whisper-cpp`
installed, model downloaded, environment variables set (see Quick Setup).

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_PATH` | `whisper-cli` | Path to whisper-cli binary |
| `WHISPER_MODEL_PATH` | `models/ggml-base.en.bin` | Path to GGML model |
| `VOICE_ENABLED` | `true` | Enable/disable plugin |
| `VOICE_MODE` | `push-to-talk` | `push-to-talk` or `toggle` |
| `VOICE_HOTKEY` | `ctrl` | Hotkey combo |
| `VOICE_AUTO_SUBMIT` | `false` | Auto-submit on finalization |
| `VOICE_STT_MODEL` | `base.en` | Model identifier |
| `VOICE_STT_LANGUAGE` | `en` | Language code (en, es, fr, de) |

---

## Troubleshooting

**"sox is not installed"**
```bash
brew install sox  # macOS
sudo apt-get install sox libsox-fmt-all  # Linux
```

**"whisper-cli binary not found"**
```bash
which whisper-cli  # Check if installed
export WHISPER_PATH="$(which whisper-cli)"  # Set correct path
```

**"Microphone permission denied" (macOS)**
System Settings > Privacy & Security > Accessibility > Enable for your terminal

**Hotkey does nothing / "Cannot read keyboard devices" (Linux)**
```bash
sudo usermod -aG input $USER   # then log out and back in
ls -l /dev/input/event*        # devices should be group "input"
```

**"sox could not open the microphone" (Linux)**
```bash
arecord -l                                   # list capture devices
sudo apt-get install libsox-fmt-pulse        # sox support for PulseAudio/PipeWire
rec -r 16000 -c 1 /tmp/test.wav              # quick mic test (Ctrl+C to stop)
```

**Plugin not loading**
- Check OpenCode logs for errors
- Ensure Whisper env vars are set: `echo $WHISPER_PATH $WHISPER_MODEL_PATH`
- Verify model exists: `ls -la ~/.config/opencode/models/ggml-base.en.bin`

---

## License

MIT
