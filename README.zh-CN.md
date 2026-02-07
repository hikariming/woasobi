<div align="center">

# WoaSobi

**多智能体 AI 桌面客户端 — 集成 Claude Code 与 Codex**

[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Hono](https://img.shields.io/badge/Hono-4.x-E36002)](https://hono.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)

[English](./README.md) | **中文**

</div>

---

### WoaSobi 是什么？

WoaSobi 是一款**三栏式 AI 开发桌面客户端**，将 **Claude Code**（通过 Anthropic Agent SDK）和 **OpenAI Codex**（通过 CLI）统一到一个对话式编程界面中。基于 Tauri 2 构建，体积小、启动快、内存占用低。

### 功能特性

- **多智能体支持** — 在 Claude Code 和 Codex 模式间自由切换，每个模式独立的模型和权限配置
- **三栏可拖拽布局** — 侧边栏、对话面板、预览面板，支持拖拽调整大小和折叠
- **实时流式输出** — 基于 SSE 的流式传输，实时展示工具调用过程
- **内嵌终端** — 基于 xterm.js 的交互式终端，通过 WebSocket 连接 PTY 会话
- **代码变更预览** — 在预览面板中实时查看 Git diff（已暂存/未暂存）
- **Artifact 预览** — 在沙箱 iframe 中渲染 HTML/React 组件
- **文件浏览器** — 直接在预览面板中浏览项目文件树
- **持久化对话** — 对话以 JSONL 格式保存在 `~/.woasobi/` 目录
- **项目自动发现** — 自动从 `~/.claude/projects/` 和 `~/.codex/` 发现项目
- **斜杠命令** — 24+ 个 Claude Code 命令和 8+ 个 Codex 命令，支持自动补全
- **权限模式** — 可配置的审批级别（Claude: 绕过/默认/接受编辑/计划；Codex: 自动编辑/建议/询问）
- **模型热切换** — 对话中随时切换模型，无需重启

### 技术架构

```
┌─────────────────────────────────┐
│  Tauri 2 桌面壳 (Rust)           │
│  ┌───────────────────────────┐  │
│  │  React 19 + Zustand 5     │  │
│  │  (Vite 开发端口 :1420)     │  │
│  └──────────┬────────────────┘  │
│             │ HTTP + SSE + WS   │
│  ┌──────────▼────────────────┐  │
│  │  Hono API (:2026 / :2620) │  │
│  │  ├─ Claude Agent SDK      │  │
│  │  ├─ Codex CLI (进程管理)   │  │
│  │  └─ node-pty (终端)        │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

| 层级 | 技术栈 |
|------|--------|
| **桌面层** | Tauri 2, Rust, 插件 (文件系统, Shell, SQLite, 对话框, 打开器) |
| **前端层** | React 19, Vite 7, Tailwind CSS 4 (OKLCH 配色), Zustand 5, Radix UI, xterm.js |
| **后端层** | Hono 4, @anthropic-ai/claude-agent-sdk, node-pty, WebSocket |
| **存储层** | 基于文件 (`~/.woasobi/`) — JSON + 追加写入 JSONL |

### 快速开始

**前置要求**: Node.js 20+、pnpm、Rust 工具链（Tauri 构建需要）

```bash
# 克隆仓库
git clone https://github.com/user/woasobi.git
cd woasobi/client

# 安装依赖
pnpm install
cd src-api && pnpm install && cd ..

# 启动开发环境（API + 前端）
pnpm dev:all

# 或启动 Tauri 桌面应用
pnpm tauri:dev
```

**配置说明**: 在应用内打开设置，配置以下密钥：
- `ANTHROPIC_AUTH_TOKEN` — Claude Code 模式所需
- `OPENAI_API_KEY` — Codex 模式所需

### 数据存储

所有数据存储在 `~/.woasobi/` 目录：

```
~/.woasobi/
├── projects.json              # 项目列表（自动发现 + 手动添加）
├── threads/
│   ├── {id}.json              # 对话元数据
│   └── {id}.jsonl             # 消息记录（追加写入）
```

### 开发路线

| 阶段 | 内容 | 状态 |
|------|------|------|
| **Phase 0** | 纯前端原型 — 三栏布局 + Mock 数据 | Done |
| **Phase 1** | 核心功能 — 真实后端 + CLI 集成 + 持久化 | Done |
| **Phase 2** | 能力增强 — Skills + MCP + 终端 + Git 操作 | In Progress |
| **Phase 3** | 多模态 — 通用对话 + 生图 + 图片理解 + 文件处理 | Planned |

---

## License

MIT
