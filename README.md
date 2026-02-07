<div align="center">

# WoaSobi

**Multi-Agent AI Desktop Client for Claude Code & Codex**

[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Hono](https://img.shields.io/badge/Hono-4.x-E36002)](https://hono.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)

**English** | [中文](./README.zh-CN.md)

</div>

---

### What is WoaSobi?

WoaSobi is a three-panel AI desktop client that unifies **Claude Code** (via Anthropic Agent SDK) and **OpenAI Codex** (via CLI) into a single conversational programming interface. Built with Tauri 2 for a lightweight, native desktop experience.

### Features

- **Multi-Agent Support** — Switch between Claude Code and Codex modes with per-agent model and permission settings
- **Three-Column Layout** — Resizable sidebar, chat panel, and preview panel with drag-to-resize
- **Real-Time Streaming** — SSE-based streaming with live tool call visualization
- **Interactive Terminal** — Embedded xterm.js terminal with WebSocket-backed PTY sessions
- **Code Changes** — Real-time git diff visualization (staged/unstaged) in the preview panel
- **Artifact Preview** — Render HTML/React artifacts in a sandboxed iframe
- **File Explorer** — Browse project file trees directly in the preview panel
- **Persistent Threads** — Conversations saved as append-only JSONL files in `~/.woasobi/`
- **Project Auto-Discovery** — Automatically discovers projects from `~/.claude/projects/` and `~/.codex/`
- **Slash Commands** — 24+ Claude Code slash commands and 8+ Codex commands with autocomplete
- **Permission Modes** — Configurable approval levels (Bypass, Default, Accept Edits, Plan for Claude; Auto Edit, Suggest, Ask for Codex)
- **Model Hot-Swap** — Change models mid-conversation without restarting

### Architecture

```
┌─────────────────────────────────┐
│  Tauri 2 Desktop Shell (Rust)   │
│  ┌───────────────────────────┐  │
│  │  React 19 + Zustand 5     │  │
│  │  (Vite dev :1420)         │  │
│  └──────────┬────────────────┘  │
│             │ HTTP + SSE + WS   │
│  ┌──────────▼────────────────┐  │
│  │  Hono API (:2026 / :2620) │  │
│  │  ├─ Claude Agent SDK      │  │
│  │  ├─ Codex CLI (spawn)     │  │
│  │  └─ node-pty (terminal)   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

| Layer | Stack |
|-------|-------|
| **Desktop** | Tauri 2, Rust, plugins (fs, shell, sql, dialog, opener) |
| **Frontend** | React 19, Vite 7, Tailwind CSS 4 (OKLCH), Zustand 5, Radix UI, xterm.js |
| **Backend** | Hono 4, @anthropic-ai/claude-agent-sdk, node-pty, WebSocket |
| **Storage** | File-based (`~/.woasobi/`) — JSON + append-only JSONL |

### Getting Started

**Prerequisites**: Node.js 20+, pnpm, Rust toolchain (for Tauri builds)

```bash
# Clone the repository
git clone https://github.com/user/woasobi.git
cd woasobi/client

# Install dependencies
pnpm install
cd src-api && pnpm install && cd ..

# Start development (API + Frontend)
pnpm dev:all

# Or start Tauri desktop app
pnpm tauri:dev
```

**Configuration**: Open Settings in the app to configure:
- `ANTHROPIC_AUTH_TOKEN` — for Claude Code mode
- `OPENAI_API_KEY` — for Codex mode

### API Endpoints

```
POST   /agent                  # Run agent (SSE stream)
POST   /agent/stop/:sessionId  # Stop running agent
GET    /projects               # List projects
POST   /projects/discover      # Auto-discover projects
GET    /threads                # List threads
GET    /threads/:id/messages   # Get thread messages
WS     /terminal/ws            # Interactive terminal
GET    /health                 # Health check
```

### Project Structure

```
woasobi/
├── client/
│   ├── src/                   # React frontend
│   │   ├── components/        # UI components (chat, sidebar, preview, settings)
│   │   ├── stores/            # Zustand stores (chat, ui, settings, projects, preview)
│   │   ├── config/            # Models, commands, permissions config
│   │   ├── lib/               # API client, utilities
│   │   └── types/             # TypeScript interfaces
│   ├── src-api/               # Hono backend
│   │   └── src/
│   │       ├── routes/        # API route handlers
│   │       ├── agents/        # Claude SDK + Codex CLI integration
│   │       ├── storage/       # File-based storage layer
│   │       └── utils/         # SSE streaming, WebSocket helpers
│   └── src-tauri/             # Tauri desktop shell (Rust)
└── workany/                   # Reference implementation (legacy)
```

### Dev Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:all` | Start API backend + Vite frontend |
| `pnpm dev` | Frontend only (Vite on :1420) |
| `pnpm dev:api` | Backend only (Hono on :2026) |
| `pnpm tauri:dev` | Backend + Tauri desktop app |
| `pnpm tauri:build` | Production Tauri build |
| `pnpm build` | TypeScript check + Vite production build |

---

## License

MIT
