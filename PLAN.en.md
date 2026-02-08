# WoaSobi AI Desktop Client - Product Planning Document

[中文版](./PLAN.md)

> Build a multi-modal AI desktop client supporting Codex / Claude Code based on the WorkAny tech stack

---

## 1. Product Positioning

A **three-column AI development desktop client** that integrates OpenAI Codex CLI and Claude Code CLI, providing a unified conversational programming experience while supporting general AI chat, image generation, file processing, and other multi-modal capabilities.

### Core Value

| Dimension | Description |
|------|------|
| **Unified Entry** | One client to control Codex, Claude Code, and general AI chat |
| **Visual Collaboration** | Left workspace management + middle chat flow + right live preview |
| **Desktop Native** | Built with Tauri 2, small size (<30MB), fast startup (<500ms), low memory |
| **Extensible** | Plugin architecture, supporting MCP protocol, custom Skills, third-party tool integration |

---

## 2. Development Methodology

### Prototype-Driven Development

```
Phase 0: Pure Frontend Prototype  →  Validate layout, interactions, information architecture
       ↓
Product Design Review             →  Confirm final design
       ↓
Phase 1: Core Development         →  Connect real backend, CLI integration
       ↓
Phase 2+: Iterative Enhancement   →  Feature expansion, multi-modal, polish
```

**Why build a prototype first?**
- Three-column layout panel proportions and collapse logic need actual experience to determine
- Chat flow UI details (message bubbles, code blocks, tool call displays) require iterative adjustments
- Right preview panel tab switching and content types need validation of information density
- Use mock data for rapid iteration, avoiding backend dependencies slowing design validation
- Prototype can run directly in browser, convenient for multi-person review

---

## 3. Tech Stack

### 3.1 Prototype Phase (Pure Frontend, Phase 0)

> Only frontend dependencies required, zero backend, runs directly in browser

| Technology | Version | Purpose |
|------|------|------|
| **React** | 19.x | UI framework |
| **TypeScript** | ~5.8 | Type safety |
| **Vite** | 7.x | Build + HMR |
| **Tailwind CSS** | 4.x | Atomic styling |
| **Radix UI + shadcn/ui** | latest | Component library (new-york style)|
| **React Router** | 7.x | Page routing |
| **Lucide React** | latest | Icons |
| **react-resizable-panels** | latest | Three-column draggable layout |
| **zustand** | 5.x | Lightweight state management |
| **framer-motion** | 11.x | Animation transitions |
| **react-markdown** | 9.x | Markdown rendering |
| **react-syntax-highlighter** | 16.x | Code highlighting |

### 3.2 Feature Development Phase (Phase 1+, introduced after prototype validation)

| Layer | Technology | Purpose |
|------|------|------|
| **Backend** | Hono 4.x | API framework |
| | Claude Agent SDK | Claude agent |
| | Anthropic Sandbox Runtime | Isolated sandbox |
| | MCP SDK 1.25+ | Tool protocol |
| | Zod 4.x | Type validation |
| | node-pty | PTY terminal |
| | chokidar 4.x | File watching |
| **Desktop** | Tauri 2.x | Desktop shell (Rust) |
| | tauri-plugin-sql | SQLite |
| | tauri-plugin-fs | File operations |
| | tauri-plugin-shell | Shell execution |
| | tauri-plugin-notification | System notifications |
| | tauri-plugin-clipboard | Clipboard |
| | tauri-plugin-global-shortcut | Global shortcuts |
| | tauri-plugin-updater | Auto-update |
| **CLI** | codex | Codex code generation |
| | claude | Claude Code CLI |
| **New Frontend** | @xterm/xterm 5.x | Embedded terminal |

---

## 4. Three-Column Layout Design

### 4.1 Overall Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│  ● ● ●     WoaSobi AI Client                    ▶ Open  ◉ Commit  │
├────────────┬─────────────────────────────┬───────────────────────────┤
│            │                             │                           │
│  SIDEBAR   │       CHAT PANEL            │     PREVIEW PANEL         │
│  (280px)   │       (flexible)            │     (flexible)            │
│  collapsible│      min 400px             │     collapsible           │
│            │                             │                           │
│ ┌────────┐ │  ┌───────────────────────┐  │  ┌─────────────────────┐ │
│ │+ Thread│ │  │  User: Help me write...│  │  │ [Uncommitted Changes]│ │
│ ├────────┤ │  │                       │  │  │  Unstaged | Staged   │ │
│ │⚡ Auto │ │  │  AI: Sure, let me...  │  │  ├─────────────────────┤ │
│ │🔧 Skill│ │  │  ┌─────────────────┐  │  │  │ ● src/app.tsx       │ │
│ │🧰 Tools│ │  │  │ code block...   │  │  │  │   + import React    │ │
│ ├────────┤ │  │  └─────────────────┘  │  │  │   - old code        │ │
│ │        │ │  │                       │  │  │                     │ │
│ │Threads │ │  │  AI: Done! ✓          │  │  │ ● src/utils.ts      │ │
│ │        │ │  │                       │  │  │   + new function     │ │
│ │ ⎿ t1   │ │  └───────────────────────┘  │  │                     │ │
│ │ ⎿ t2   │ │                             │  ├─────────────────────┤ │
│ │ ⎿ t3   │ │                             │  │ [Artifact Preview]  │ │
│ │        │ │                             │  │  HTML / React / IMG │ │
│ ├────────┤ │  ┌───────────────────────┐  │  │                     │ │
│ │Workspace│ │  │ + │ Claude ▾│Auto ▾│⬆│  │  │                     │ │
│ │ ⎿ proj1│ │  └───────────────────────┘  │  └─────────────────────┘ │
│ │ ⎿ proj2│ │                             │                           │
│ ├────────┤ │                             │                           │
│ │⚙ Set  │ │                             │                           │
└────────────┴─────────────────────────────┴───────────────────────────┘
```

### 4.2 Left Sidebar (280px, collapsible to icon mode 48px)

```
┌──────────────────────┐
│ [WoaSobi Logo]       │         ← Brand identity
├──────────────────────┤
│ + New Thread         │         ← Primary action button
├──────────────────────┤
│ ⚡ Automations       │
│ 🔧 Skills            │         ← Quick function entry (click to expand secondary panel)
│ 🧰 Tools             │
├──────────────────────┤
│ Threads         🔍 ≡ │         ← Search + sort
│ ┌──────────────────┐ │
│ │ 📂 aipt4          │ │         ← Workspace grouping
│ │  ├ Add sidebar..2d│ │
│ │  ├ My ai-arco.. 4m│ │         ← Thread item (title + time)
│ │  └ Current power..4m│ │
│ │ 📂 yizhi5          │ │
│ │  ├ Add quota..10h │ │
│ │  ├ Fix shadow.. 10h│ │
│ │  └ Add legacy.. 2d│ │
│ │ Show more ▾       │ │
│ └──────────────────┘ │
├──────────────────────┤
│ ⚙ Settings  │Upgrade│ │         ← Bottom fixed
└──────────────────────┘
```

**Skills Secondary Panel** (slides out from left when Skills button is clicked)
```
┌──────────────────────┐
│ ← Skills             │
├──────────────────────┤
│ 🔍 Search skills...  │
├──────────────────────┤
│ 📝 Code Generation   │
│ 🔍 Code Review       │
│ 🐛 Bug Fix           │
│ ♻️ Refactor           │
│ 🧪 Test Writing      │
│ 📄 Documentation     │
│ 🎨 Image Generation  │
│ 🌐 Translation       │
├──────────────────────┤
│ + Create Custom Skill│
└──────────────────────┘
```

**Tools Secondary Panel**
```
┌──────────────────────┐
│ ← Tools              │
├──────────────────────┤
│ 💻 Terminal           │
│ 📁 File Explorer      │
│ 🔀 Git Operations     │
│ 🔌 MCP Servers        │
├──────────────────────┤
│ + Add MCP Tool        │
└──────────────────────┘
```

### 4.3 Middle Chat Panel (flexible, min 400px)

```
┌──────────────────────────────────────┐
│  📝 Add quota display and approval  yizhi5  … │  ← Title bar (thread name + workspace name)
├──────────────────────────────────────┤
│                                      │
│  ┌─ User ──────────────────────────┐ │
│  │ What are dirty files?           │ │  ← User message
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─ AI ───────────────────────────┐  │
│  │ It refers to files in the      │  │
│  │ current git working tree that   │  │  ← AI message (Markdown)
│  │ had "uncommitted changes" before│  │
│  │ my current modifications.       │  │
│  │                                │  │
│  │ These are what I see (untouched):│ │
│  │ • migration.sql                │  │  ← List/links
│  │ • migration.sql                │  │
│  │ • migration_lock.toml          │  │
│  │                                │  │
│  │ ┌─ Tool Call ───────────────┐  │  │
│  │ │ 🔧 read_file              │  │  │  ← Tool call (collapsible)
│  │ │ path: src/migration.sql   │  │  │
│  │ │ ▾ Show output             │  │  │
│  │ └──────────────────────────┘  │  │
│  │                                │  │
│  │ ```sql                        │  │
│  │ ALTER TABLE users ADD ...     │  │  ← Code block (syntax highlighting)
│  │ ```               [Copy][Apply]│ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌─ User ──────────────────────────┐ │
│  │ No rush, allow use without key  │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─ AI ───────────────────────────┐  │
│  │ Understood, so we'll maintain  │  │
│  │ the status quo: /public/v1     │  │
│  │ continues to allow keyless     │  │
│  │ access; only with sk- key will │  │
│  │ it bind user identity and deduct│ │
│  │ balance.                       │  │
│  └────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Ask for follow-up changes...     │ │  ← Input box (expandable multiline)
│ │                                  │ │
│ ├──────────────────────────────────┤ │
│ │[+][Claude-4.5 ▾][Auto ▾][🎤][⬆]│ │  ← Toolbar
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [💻▾] [😊▾]         [🔀▾] [⏳]     │  ← Bottom status bar
└──────────────────────────────────────┘
```

**Input Bar Details**
```
[+]           → Quick menu: attachments, images, file references, / commands
[Claude-4.5 ▾] → Model selector dropdown
[Auto ▾]      → Execution mode: Auto / Ask / Manual
[🎤]          → Voice input (long press to record)
[⬆]           → Send button (Cmd+Enter)
```

**Bottom Status Bar**
```
[💻▾]  → Terminal status/open terminal
[😊▾]  → Emoji/feedback
[🔀▾]  → Git branch selection
[⏳]   → Task progress/Token usage
```

### 4.4 Right Preview Panel (collapsible, draggable width)

**Tab Switching Header**
```
┌────────────────────────────────────┐
│ [Changes] [Artifact] [Terminal]    │
│ [Image]   [Files]                  │
├────────────────────────────────────┤
│           (Tab content area)       │
└────────────────────────────────────┘
```

**Tab 1: Code Changes (default Tab)**
```
┌────────────────────────────────────┐
│ Uncommitted changes             ▾  │  ← Dropdown: All/Uncommitted/Staged
│  [Unstaged] [Staged]         ···   │  ← Toggle + action menu
├────────────────────────────────────┤
│                                    │
│  📄 src/api/billing.ts        [+]  │  ← File list ([+] to stage)
│  📄 src/middleware/auth.ts    [+]  │
│  📄 prisma/migration.sql      [+]  │
│                                    │
│ ─── diff preview ──────────────── │
│  src/api/billing.ts                │
│  @@ -12,6 +12,15 @@               │
│    import { db } from '../db'      │
│  + import { billing } from './...' │  ← Green highlight (addition)
│  - import { old } from './...'     │  ← Red highlight (deletion)
│    export function handler() {     │
│                                    │
│  No unstaged changes               │  ← Empty state prompt
│  Code changes will appear here     │
│                                    │
└────────────────────────────────────┘
```

**Tab 2: Artifact Preview**
```
┌────────────────────────────────────┐
│ 🔄 Refresh │ 📐 Responsive │ ↗ Open│
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ │    (iframe sandbox render)     │ │
│ │    HTML / React Component      │ │
│ │                                │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

**Tab 3: Terminal**
```
┌────────────────────────────────────┐
│ Terminal 1 │ + New Tab        [×]  │
├────────────────────────────────────┤
│ $ npm run build                    │
│ > workany@0.1.16 build             │
│ > vite build                       │
│                                    │
│ ✓ 42 modules transformed          │
│ dist/index.html    0.45 kB         │
│ dist/assets/...    156.32 kB       │
│                                    │
│ $ _                                │
└────────────────────────────────────┘
```

**Tab 4: Image Preview**
```
┌────────────────────────────────────┐
│ [Gallery ▾] │ 💾 Save │ 🔄 Regen  │
├────────────────────────────────────┤
│                                    │
│        ┌──────────────┐            │
│        │              │            │
│        │ Generated    │            │
│        │ Image        │            │
│        │              │            │
│        └──────────────┘            │
│                                    │
│  Prompt: "A sunset over..."        │
│  Model: DALL-E 3                   │
│  Size: 1024x1024                   │
│                                    │
└────────────────────────────────────┘
```

**Tab 5: Files**
```
┌────────────────────────────────────┐
│ 📁 yizhi5/semi-design-pro   🔍    │
├────────────────────────────────────┤
│ ▾ 📂 src/                          │
│   ▾ 📂 api/                        │
│     📄 billing.ts                  │
│     📄 auth.ts                     │
│   ▸ 📂 components/                 │
│   ▸ 📂 pages/                      │
│   📄 App.tsx                       │
│ ▸ 📂 prisma/                       │
│ 📄 package.json                    │
│ 📄 tsconfig.json                   │
└────────────────────────────────────┘
```

### 4.5 Responsive Collapse Strategy

| Window Width | Sidebar | Chat | Preview |
|----------|---------|------|---------|
| >= 1400px | 280px expanded | flexible | flexible |
| 1000-1400px | 48px icon mode | flexible | flexible |
| 800-1000px | 48px icon mode | flexible | Hidden (bottom drawer) |
| < 800px | Hidden (hamburger menu)| Fullscreen | Hidden |

---

## 5. Phase 0 — Pure Frontend Prototype (Current Phase)

### 5.1 Goals

- Implement complete three-column layout interaction with mock data + pure frontend
- Can **run directly in browser** (`pnpm dev`), no Tauri / backend needed
- All interactions clickable and experienceable, validate information architecture and interaction flow
- Serve as product design review deliverable

### 5.2 Prototype Scope

| Module | To Do | Not To Do |
|------|------|------|
| **Three-Column Layout** | Draggable panels, collapse/expand, responsive | - |
| **Sidebar** | Thread list, Workspace grouping, Skills/Tools secondary panels | Real data persistence |
| **Chat** | Message list rendering, Markdown/code blocks, tool call display | Real AI conversation |
| **Chat Input** | Multiline input, model selector, mode selector, send button | Real send/SSE |
| **Preview - Changes** | Git diff file list, Unstaged/Staged toggle, diff highlighting | Real Git operations |
| **Preview - Artifact** | iframe preview placeholder | Real sandbox rendering |
| **Preview - Terminal** | Terminal style display | Real PTY |
| **Preview - Image** | Image display area | Real AI image generation |
| **Preview - Files** | File tree display | Real file system |
| **Settings** | Settings dialog UI (all Tab layouts) | Real config persistence |
| **Theme** | Dark / Light toggle | - |
| **Animation** | Panel transitions, message appearance animations | - |
| **Mock Data** | Mock conversations, diffs, file trees, etc. | - |

### 5.3 Mock Data Approach

```typescript
// mocks/threads.ts - Mock thread list
export const mockThreads: Thread[] = [
  {
    id: 'thread-1',
    title: 'Add quota display and approval functionality',
    workspaceId: 'ws-yizhi5',
    model: 'claude-4.5-sonnet',
    mode: 'agent',
    updatedAt: '10h ago',
  },
  {
    id: 'thread-2',
    title: 'Fix shadow DB migration error',
    workspaceId: 'ws-yizhi5',
    model: 'gpt-5.3-codex',
    mode: 'agent',
    updatedAt: '10h ago',
  },
  // ...
]

// mocks/messages.ts - Mock conversation messages
export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'What are dirty files?',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'It refers to files in the current git working tree that had "uncommitted changes" before my current modifications.\n\nThese are what I see (untouched):\n- migration.sql\n- migration_lock.toml',
    toolCalls: [
      { name: 'read_file', args: { path: 'src/migration.sql' } }
    ],
  },
  // ...
]

// mocks/git-changes.ts - Mock Git diff
export const mockGitChanges: GitChange[] = [
  {
    file: 'src/api/billing.ts',
    status: 'modified',
    staged: false,
    additions: 15,
    deletions: 3,
    diff: '@@ -12,6 +12,15 @@\n import { db }...',
  },
  // ...
]

// mocks/skills.ts - Mock skill list
// mocks/workspaces.ts - Mock workspaces
// mocks/file-tree.ts - Mock file tree
```

### 5.4 Mock Interaction Behaviors

| Interaction | Mock Approach |
|------|----------|
| Send message | Append to local message list → Delay 1s then append a mock AI reply |
| Streaming output | Use `setInterval` to append mock AI text character by character, simulating typing effect |
| Switch Thread | Load corresponding message list from mock data |
| Switch workspace | Filter and display Threads for corresponding workspace |
| Git Changes | Switch mock file list when toggling Unstaged/Staged |
| Skills panel | Click to expand/collapse secondary panel |
| Settings dialog | Dialog open/close, Tab switching |
| Theme toggle | Tailwind dark mode toggle |
| Panel drag | react-resizable-panels real dragging |
| Panel collapse | Animation transition collapse/expand |

### 5.5 Prototype Directory Structure

```
workany/src/
├── app/
│   ├── App.tsx                      # Root component
│   ├── router.tsx                   # Routing (prototype only / and /settings)
│   └── pages/
│       └── Home.tsx                 # Main page (mounts three-column layout)
│
├── components/
│   ├── ui/                          # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tooltip.tsx
│   │   ├── tabs.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   └── sheet.tsx
│   │
│   ├── layout/
│   │   ├── AppLayout.tsx            # Three-column main layout (ResizablePanelGroup)
│   │   ├── TitleBar.tsx             # Top title bar (Open/Commit buttons)
│   │   └── StatusBar.tsx            # Bottom status bar
│   │
│   ├── sidebar/
│   │   ├── Sidebar.tsx              # Sidebar container
│   │   ├── SidebarHeader.tsx        # Logo + New Thread button
│   │   ├── QuickActions.tsx         # Automations / Skills / Tools entry
│   │   ├── ThreadList.tsx           # Thread list (grouped by workspace)
│   │   ├── ThreadItem.tsx           # Single thread item
│   │   ├── WorkspaceGroup.tsx       # Workspace group header
│   │   ├── SkillsPanel.tsx          # Skills secondary panel
│   │   ├── ToolsPanel.tsx           # Tools secondary panel
│   │   ├── AutomationsPanel.tsx     # Automations secondary panel
│   │   └── SidebarFooter.tsx        # Settings + Upgrade
│   │
│   ├── chat/
│   │   ├── ChatPanel.tsx            # Chat panel container
│   │   ├── ChatHeader.tsx           # Chat title bar
│   │   ├── MessageList.tsx          # Message list (virtual scrolling reserved)
│   │   ├── MessageBubble.tsx        # Message bubble (different styles for User/AI)
│   │   ├── MarkdownRenderer.tsx     # Markdown rendering wrapper
│   │   ├── CodeBlock.tsx            # Code block (highlighting + Copy + Apply)
│   │   ├── ToolCallView.tsx         # Tool call display (collapse/expand)
│   │   ├── ChatInput.tsx            # Input box component
│   │   ├── ModelSelector.tsx        # Model selection dropdown
│   │   ├── ModeSelector.tsx         # Execution mode selector (Auto/Ask/Manual)
│   │   └── QuickCommandMenu.tsx     # / command quick menu
│   │
│   ├── preview/
│   │   ├── PreviewPanel.tsx         # Preview panel container (Tab switching)
│   │   ├── CodeChangesTab.tsx       # Git Changes Tab
│   │   ├── DiffView.tsx             # Diff highlighting display
│   │   ├── FileChangeItem.tsx       # Changed file item
│   │   ├── ArtifactTab.tsx          # Artifact preview Tab
│   │   ├── TerminalTab.tsx          # Terminal output Tab
│   │   ├── ImageTab.tsx             # Image preview Tab
│   │   └── FilesTab.tsx             # File browser Tab
│   │
│   ├── settings/
│   │   ├── SettingsDialog.tsx       # Settings dialog
│   │   └── tabs/
│   │       ├── AccountSettings.tsx
│   │       ├── ModelSettings.tsx
│   │       ├── GeneralSettings.tsx
│   │       ├── MCPSettings.tsx
│   │       ├── WorkspaceSettings.tsx
│   │       ├── SkillsSettings.tsx
│   │       └── AboutSettings.tsx
│   │
│   └── common/
│       ├── Avatar.tsx               # User/AI avatar
│       ├── EmptyState.tsx           # Empty state placeholder
│       └── Badge.tsx                # Badge component
│
├── stores/
│   ├── chat.ts                      # Chat state (Zustand)
│   ├── workspace.ts                 # Workspace state
│   ├── ui.ts                        # UI state (panel collapse, theme, etc.)
│   ├── preview.ts                   # Preview panel state
│   └── index.ts
│
├── mocks/
│   ├── threads.ts                   # Mock thread list
│   ├── messages.ts                  # Mock message data
│   ├── git-changes.ts              # Mock Git diff
│   ├── workspaces.ts               # Mock workspaces
│   ├── skills.ts                    # Mock skill list
│   ├── tools.ts                     # Mock tool list
│   ├── file-tree.ts                # Mock file tree
│   └── index.ts                     # Unified export
│
├── shared/
│   ├── types/
│   │   ├── thread.ts               # Thread types
│   │   ├── message.ts              # Message types
│   │   ├── workspace.ts            # Workspace types
│   │   ├── git.ts                  # Git-related types
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useSimulatedChat.ts     # Simulated chat hook
│   │   ├── useTheme.ts             # Theme toggle hook
│   │   └── usePanelLayout.ts       # Panel layout hook
│   ├── lib/
│   │   └── utils.ts                # Utility functions (cn, formatTime, etc.)
│   └── providers/
│       ├── theme-provider.tsx
│       └── store-provider.tsx
│
└── config/
    ├── style/
    │   └── global.css              # Global styles + CSS variables
    └── constants.ts                 # Constants definition
```

### 5.6 Prototype Milestones

| Milestone | Time | Deliverable | Acceptance Criteria |
|--------|------|--------|----------|
| **P0-M1: Layout Skeleton** | Day 1-2 | Three-column draggable layout + shell components | Panels can be dragged to adjust width, can collapse/expand |
| **P0-M2: Sidebar** | Day 3-4 | Thread list + workspace grouping + secondary panels | Click to switch Threads, Skills/Tools panels can expand |
| **P0-M3: Chat** | Day 5-7 | Message rendering + input box + simulated chat | Markdown/code blocks render correctly, simulated streaming output |
| **P0-M4: Preview** | Day 8-10 | All 5 Tabs implemented | Changes/Artifact/Terminal/Image/Files can switch |
| **P0-M5: Polish** | Day 11-12 | Animations + theme + settings dialog + responsive | Dark/Light toggle, all breakpoints display normally |
| **P0-M6: Review** | Day 13-14 | Product design review + revisions | Collect feedback, confirm final design |

---

## 6. Phase 1 — Core Feature Development (After Prototype Validation)

> After Phase 0 prototype review passes, replace Mock with real backend

### 6.1 Goals

Upgrade prototype to usable desktop client, connect to real AI backend and CLI.

### 6.2 Feature Checklist

| Module | Feature Points | Priority |
|------|--------|--------|
| **Backend API** | Hono service startup, SSE streaming communication | P0 |
| **CLI Integration** | Codex / Claude CLI process management (PTY) | P0 |
| **Model Management** | Multi-Provider configuration (Anthropic/OpenAI/Custom) | P0 |
| **Real Chat** | Replace Mock → Real AI chat + streaming rendering | P0 |
| **Workspace Binding** | Project directory selection + Git repository detection | P0 |
| **Git Changes** | Real Git diff reading + file staging | P0 |
| **Local Storage** | SQLite persistence for chats/settings/workspaces | P0 |
| **Tauri Packaging** | Desktop app build (macOS/Linux/Windows) | P0 |
| **Settings Persistence** | API Key / Provider / preference configuration | P1 |
| **Code Apply** | Apply AI code blocks to files | P1 |

### 6.3 Database Schema

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  git_remote TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id),
  title TEXT,
  model TEXT,
  mode TEXT DEFAULT 'agent',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT REFERENCES threads(id),
  role TEXT NOT NULL,
  content TEXT,
  tool_calls TEXT,
  attachments TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  api_key TEXT,
  base_url TEXT,
  models TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT,
  category TEXT,
  is_builtin BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Phase 2 — Capability Enhancement

| Module | Feature Points |
|------|--------|
| **Skills System** | Preset skills + custom Skill editor |
| **Automations** | Automated workflows (triggers + action chains)|
| **MCP Integration** | MCP Server management, Tool registration/invocation |
| **Embedded Terminal** | xterm.js real terminal, multi-Tab |
| **Artifact Preview** | HTML/React iframe sandbox rendering |
| **Commit Assistant** | AI-generated commit message, one-click commit |
| **Git Operations** | Commit / Push / Pull / Branch UI |
| **File Browser** | Workspace file tree + search |

---

## 8. Phase 3 — Multi-Modal Extension

| Module | Feature Points |
|------|--------|
| **General Chat** | Pure Chat mode (no Agent) |
| **Image Generation** | DALL-E / Stable Diffusion / Midjourney API |
| **Image Understanding** | Upload image + multi-modal analysis |
| **File Processing** | PDF/Excel/Word parsing |
| **Voice Input** | Whisper speech-to-text |
| **TTS Output** | AI response voice reading |
| **Plugin Marketplace** | Third-party plugin installation/management |

---

## 9. Core Architecture (Complete)

### 9.1 Process Architecture

```
┌──────────────────────────────────────────────┐
│           Tauri Main Process (Rust)          │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Window   │  │ File     │  │ Shell      │ │
│  │ Mgmt     │  │ System   │  │ Execution  │ │
│  │ System   │  │ SQLite   │  │ Global     │ │
│  │ Notify   │  │          │  │ Shortcuts  │ │
│  └──────────┘  └──────────┘  └────────────┘ │
├──────────────────────────────────────────────┤
│            WebView (Frontend Render)         │
│  ┌────────────────────────────────────────┐  │
│  │  React App (Sidebar + Chat + Preview)  │  │
│  │  ┌──────┐  ┌────────┐  ┌───────────┐  │  │
│  │  │Zustand│  │Router  │  │ xterm.js  │  │  │
│  │  │ Store │  │ Pages  │  │ Terminal  │  │  │
│  │  └──────┘  └────────┘  └───────────┘  │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│            API Subprocess (Node.js)          │
│  ┌──────────────────────────────────────┐    │
│  │  Hono Server (port 2026)             │    │
│  │  ┌──────────┐  ┌──────────────────┐  │    │
│  │  │ Agent    │  │  Provider Manager │  │    │
│  │  │ Runtime  │  │  (Multi-LLM)     │  │    │
│  │  ├──────────┤  ├──────────────────┤  │    │
│  │  │ Sandbox  │  │  MCP Manager     │  │    │
│  │  │ Pool     │  │  (Tools)         │  │    │
│  │  └──────────┘  └──────────────────┘  │    │
│  └──────────────────────────────────────┘    │
├──────────────────────────────────────────────┤
│            External CLI Processes            │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │ codex CLI  │  │ claude CLI             │  │
│  │ (PTY)      │  │ (PTY)                  │  │
│  └────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 9.2 Data Flow

```
User Input
  │
  ▼
Frontend (React) ──SSE──▶ API (Hono)
  │                      │
  │                  ┌───┴───┐
  │                  ▼       ▼
  │            Agent SDK   CLI Process
  │            (Direct API)(codex/claude)
  │                  │       │
  │                  ▼       ▼
  │             AI Provider (Anthropic/OpenAI/...)
  │                  │       │
  │                  ▼       ▼
  │◀────SSE────── Streaming Response ──┘
  │
  ▼
Zustand Store State Update
  │
  ├──▶ Chat Panel (message rendering)
  ├──▶ Preview Panel (diff/artifact update)
  └──▶ Sidebar (thread state update)
```

---

## 10. UI/UX Design Specifications

### 10.1 Color Scheme

```css
/* Dark Theme (default) */
--bg-primary:    #1a1a2e;
--bg-secondary:  #16213e;
--bg-elevated:   #0f3460;
--text-primary:  #e0e0e0;
--text-secondary:#a0a0a0;
--accent:        #7c3aed;
--accent-hover:  #6d28d9;
--border:        #2a2a4a;
--success:       #10b981;
--warning:       #f59e0b;
--error:         #ef4444;

/* Light Theme */
--bg-primary:    #ffffff;
--bg-secondary:  #f8f9fa;
--bg-elevated:   #ffffff;
--text-primary:  #1a1a2e;
--text-secondary:#6b7280;
--accent:        #7c3aed;
--border:        #e5e7eb;
```

### 10.2 Typography

| Usage | Font |
|------|------|
| UI Text | Inter / system-ui |
| Code | JetBrains Mono / Fira Code |
| Chinese | PingFang SC / Noto Sans CJK |

### 10.3 Keyboard Shortcuts

| Shortcut | Function |
|--------|------|
| `Cmd+N` | New thread |
| `Cmd+K` | Global search |
| `Cmd+Enter` | Send message |
| `Cmd+Shift+P` | Command palette |
| `Cmd+B` | Toggle sidebar |
| `Cmd+J` | Toggle preview panel |
| `` Cmd+` `` | Toggle terminal |
| `Cmd+1/2/3` | Switch preview Tab |

---

## 11. Competitive Analysis

| Product | Highlights | What to Learn |
|------|------|--------|
| **Codex Desktop** (screenshot prototype) | Three-column layout, Git integration, Skills | Layout structure, Git Changes panel |
| **Cursor** | AI code editor, inline diff | Apply button, diff preview |
| **Windsurf** | Cascade streaming chat | Streaming UI experience |
| **Claude Desktop** | Artifact preview, MCP | Artifact rendering |
| **Warp** | AI terminal, Block mode | Terminal integration |

---

## 12. Risks and Mitigation

| Risk | Mitigation Strategy |
|------|----------|
| CLI process management complexity | Unified PTY management + timeout cleanup + process pool |
| Multi-model API format differences | Provider abstraction layer + Adapter pattern |
| Large file diff performance | Virtual scrolling + Web Worker parsing |
| Tauri WebView compatibility | Standard Web API, CI multi-platform testing |
| API Key security | Tauri Keyring encrypted storage |

---

## Summary: Development Path

```
┌─────────────────────────────────────────────────┐
│  Phase 0: Pure Frontend Prototype (2 weeks)     │
│  ✦ Three-column layout + Mock data + all UI    │
│  ✦ Runs directly in browser, zero backend deps │
│  ✦ Product design review → Confirm final design│
├─────────────────────────────────────────────────┤
│  Phase 1: Core Features (4-6 weeks)             │
│  ✦ Mock → Real backend (Hono + Agent SDK)      │
│  ✦ Codex / Claude CLI integration              │
│  ✦ SQLite persistence + Tauri packaging        │
├─────────────────────────────────────────────────┤
│  Phase 2: Capability Enhancement (4-6 weeks)    │
│  ✦ Skills + MCP + Terminal + Git operations    │
├─────────────────────────────────────────────────┤
│  Phase 3: Multi-Modal (4-6 weeks)               │
│  ✦ General chat + image gen + image           │
│     understanding + file processing             │
├─────────────────────────────────────────────────┤
│  Phase 4+: Continuous Iteration                 │
│  ✦ Plugin marketplace + team collab + perf opt │
└─────────────────────────────────────────────────┘
```

> 📌 **Current Action: Launch Phase 0, deliver experienceable pure frontend prototype in 2 weeks.**
