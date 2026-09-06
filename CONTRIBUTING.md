# Contributing to opencode-voice

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/opencode-voice.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature
   ```

## Development

### Prerequisites

- Node.js 18+
- TypeScript
- sox (for audio recording)
- whisper.cpp (optional, for local STT)

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Type Check

```bash
npm run typecheck
```

## Making Changes

1. Keep changes focused and minimal
2. Follow existing code style
3. Add tests for new functionality
4. Update documentation if needed

## Commit Messages

Use clear, descriptive commits:

- `fix: resolve microphone permission issue on macOS`
- `feat: add support for French language`
- `docs: update configuration examples`

## Pull Requests

1. Ensure all tests pass
2. Update README if adding features
3. Keep PRs focused on one change
4. Describe what your change does and why

## Reporting Issues

- Include OS and Node version
- Provide steps to reproduce
- Share relevant logs or error messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
