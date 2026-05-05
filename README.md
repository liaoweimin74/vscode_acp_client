# ACP - VSCode AI Agent Client

A feature-rich VSCode extension that connects AI coding CLIs via the [Agent Client Protocol (ACP)](https://github.com/AcpProtocol/acp) to enable AI agent programming. The extension supports ACP-protocol CLI tools such as OpenCode, Claude Code, Codex, and more.
Switch models, agents, view sub-agent context, and manage sessions — all from your VSCode sidebar.
100% of the code is implemented through AI agent programming using the OpenCode CLI tool.

## Features

- **Agent Discovery** — Browse and install ACP-compatible agents from the official registry
- **Agent Selector** — Connect to any ACP-compatible CLI (OpenCode, Claude, etc.)
- **Model & Thought Level Switching** — Change model and thinking depth on the fly
- **Session Management** — Create, switch, resume, and close chat sessions
- **Streaming Messages** — Real-time message streaming with Markdown + code highlighting
- **Tool Call Cards** — Expandable cards showing tool calls with arguments and results
- **Sub-Agent Views** — Inspect sub-agent conversations inline
- **Slash Commands** — `/model`, `/think`, `/agent`, `/clear`, `/help`

## Getting Started

### Prerequisites

- VSCode 1.85+
- An ACP-compatible CLI installed (e.g., [OpenCode](https://github.com/opencode-ai/opencode))

### Installation

1. Load the `.vsix` file manually (not yet published to the VSCode Marketplace)
2. Open Settings → search for `ACP`
3. Configure your agents in `vscodeAcp.agents`

### Configuration

Add agents to your VSCode settings:

```json
{
  "vscodeAcp.agents": [
    {
      "id": "opencode",
      "name": "OpenCode",
      "command": "opencode",
      "args": ["serve"],
      "env": {}
    },
    {
      "id": "my-agent",
      "name": "My Custom Agent",
      "command": "my-agent-cli",
      "args": [],
      "env": {
        "API_KEY": "sk-..."
      }
    }
  ],
  "vscodeAcp.defaultAgent": "opencode"
}
```

### Agent Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier for the agent |
| `name` | Yes | Display name shown in the UI |
| `command` | Yes | CLI command to start the agent |
| `args` | No | Command-line arguments |
| `env` | No | Environment variables passed to the process |

## Usage

1. Open the **ACP Agent** sidebar from the activity bar
2. Select an agent from the dropdown (connects automatically on first use)
3. A new session is created automatically
4. Type messages and press **Enter** to send (**Shift+Enter** for newline)
5. Use **/** prefix to access slash commands
6. Click the **Model** or **Think** buttons to change config options

### Commands

| Command | Description |
|---------|-------------|
| `ACP: Discover Agents` | Browse and install agents from the ACP registry |
| `ACP: Select Agent` | Switch between configured agents |
| `ACP: New Session` | Create a new chat session |
| `ACP: Switch Session` | Switch to an existing session |
| `ACP: Select Model` | Change the current model |
| `ACP: Set Thought Level` | Adjust thinking depth |
| `ACP: Open Settings` | Open ACP settings |

## Development

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Build webview
npm run build:webview

# Build everything
npm run build:all

# Run tests
npm test

# Watch mode (extension)
npm run watch

# Watch mode (webview)
npm run watch:webview

# Lint
npm run lint

# Package as .vsix
npm run package
```

## Architecture

```
src/
├── extension/       # VSCode extension host
│   ├── index.ts     # Activation, lifecycle, wiring
│   ├── StateManager.ts
│   ├── ConfigurationManager.ts
│   ├── WebviewBridge.ts
│   ├── commands/    # VSCode commands
│   └── views/       # SidebarProvider, StatusBar
├── protocol/        # ACP protocol layer
│   ├── AgentConnection.ts
│   └── AgentRegistry.ts
├── shared/          # Shared types & utilities
│   ├── types/
│   └── EventEmitter.ts
└── webview/         # React webview UI
    ├── api/         # VSCode API bridge
    ├── store/       # Zustand state
    ├── components/  # React components
    └── App.tsx
```

## License

MIT
