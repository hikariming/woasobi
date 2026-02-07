# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WoaSobi is an AI desktop client that integrates Claude Code (via Agent SDK) and Codex CLI into a unified chat interface. Built as a Tauri 2 desktop app with a React frontend and a lightweight Hono backend.

## Development Commands

All commands run from `client/` directory using pnpm:

```bash
pnpm dev:all          # Start both API backend + Vite frontend
pnpm dev              # Frontend only (Vite on :1420)
pnpm dev:api          # Backend only (Hono on :2026)
pnpm tauri:dev        # Backend + Tauri desktop app
pnpm tauri:build      # Production Tauri build
pnpm build            # TypeScript check + Vite production build
```

API-specific commands from `client/src-api/`:
```bash
pnpm dev              # tsx watch mode
pnpm build            # tsc compile to dist/
pnpm start            # Run compiled output
```

No test framework is currently configured.

## Architecture

```
┌─────────────────────────────────┐
│  Tauri 2 Desktop Shell (Rust)   │
│  ┌───────────────────────────┐  │
│  │  React 19 + Zustand 5     │  │
│  │  (Vite :1420)             │  │
│  └──────────┬────────────────┘  │
│             │ HTTP + SSE        │
│  ┌──────────▼────────────────┐  │
│  │  Hono API (:2026 / :2620) │  │
│  │  ├─ Claude Agent SDK      │  │
│  │  └─ Codex CLI (spawn)     │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Frontend** (`client/src/`): React app with three-column resizable layout (sidebar, chat, preview). State managed by Zustand stores. Path alias `@/*` maps to `src/*`.

**Backend** (`client/src-api/src/`): Hono server handling agent execution via SSE streaming (`POST /agent`), plus REST endpoints for projects and threads CRUD.

**Data storage**: File-based in `~/.woasobi/` — `projects.json`, `threads/{id}.json` (metadata), `threads/{id}.jsonl` (messages as append-only JSONL).

## Key Stores

- `stores/chat.ts` — Chat state, SSE streaming, thread-scoped message management
- `stores/settings.ts` — API keys, model selection (persisted to localStorage as `woasobi-settings`)
- `stores/ui.ts` — UI state, mode selector (ClaudeCode/Codex/WoAgent), backend health
- `stores/projects.ts` — Project list with auto-discovery from `~/.claude/projects/` and `~/.codex/`

## Agent Integration

- **Claude Code**: Uses `@anthropic-ai/claude-agent-sdk` `query()` — configured via `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL`
- **Codex**: Spawns CLI process with stdout/stderr capture — configured via `OPENAI_API_KEY`, `CODEX_MODEL`
- SSE events: `session`, `text`, `tool_use`, `tool_result`, `result`, `error`, `done`
- Agent route auto-persists messages when `threadId` is provided in request

## API Endpoints

```
POST /agent                    # Run agent (SSE stream)
POST /agent/stop/:sessionId    # Abort running agent
GET/POST/PATCH/DELETE /projects
POST /projects/discover        # Auto-discover from CLI data
DELETE /projects/:id/threads   # Clear all threads for project
GET/POST/PATCH/DELETE /threads
GET /threads/:id/messages
GET /health
```

## Tech Stack

- **Frontend**: React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4 (OKLCH theming), Radix UI, react-resizable-panels
- **Backend**: Hono 4, @hono/node-server, claude-agent-sdk
- **Desktop**: Tauri 2 (Rust), plugins: fs, shell, sql (SQLite), opener
- **Styling**: `cn()` utility (clsx + tailwind-merge) in `lib/utils.ts`

## Conventions

- Functional React components only, Zustand for all state management
- REST for data operations, SSE for agent streaming
- Port 2026 (dev) / 2620 (prod) for API; port 1420 for Vite dev server
- `workany/` is the older reference app — not actively developed
