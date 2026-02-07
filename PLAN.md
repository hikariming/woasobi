# WoaSobi AI Desktop Client - 产品规划文档

> 基于 WorkAny 技术栈，打造支持 Codex / Claude Code 的多模态 AI 桌面客户端

---

## 一、产品定位

一款**三栏式 AI 开发桌面客户端**，集成 OpenAI Codex CLI 和 Claude Code CLI，提供统一的对话式编程体验，同时支持通用 AI 对话、生图、文件处理等多模态能力。

### 核心价值

| 维度 | 描述 |
|------|------|
| **统一入口** | 一个客户端同时操控 Codex、Claude Code、通用 AI 对话 |
| **可视化协作** | 左侧工作区管理 + 中间对话流 + 右侧实时预览 |
| **桌面原生** | Tauri 2 构建，体积小 (<30MB)、启动快 (<500ms)、内存低 |
| **可扩展** | 插件化架构，支持 MCP 协议、自定义 Skill、第三方工具接入 |

---

## 二、开发方法论

### 原型驱动开发 (Prototype-Driven Development)

```
Phase 0: 纯前端原型        →  验证布局、交互、信息架构
       ↓
产品设计评审              →  确认最终设计方案
       ↓
Phase 1: 核心功能开发      →  接入真实后端、CLI 集成
       ↓
Phase 2+: 迭代增强        →  能力扩展、多模态、打磨
```

**为什么先做原型？**
- 三栏布局的面板比例、折叠逻辑需要实际体验才能确定
- 对话流的 UI 细节（消息气泡、代码块、工具调用展示）需要反复调整
- 右侧预览面板的 Tab 切换、内容类型需要验证信息密度
- 用 Mock 数据快速迭代，避免后端依赖拖慢设计验证
- 原型可直接用浏览器运行，方便多人评审

---

## 三、技术栈

### 3.1 原型阶段（纯前端，Phase 0）

> 仅需前端依赖，零后端，浏览器直接运行

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 19.x | UI 框架 |
| **TypeScript** | ~5.8 | 类型安全 |
| **Vite** | 7.x | 构建 + HMR |
| **Tailwind CSS** | 4.x | 原子化样式 |
| **Radix UI + shadcn/ui** | latest | 组件库（new-york 风格）|
| **React Router** | 7.x | 页面路由 |
| **Lucide React** | latest | 图标 |
| **react-resizable-panels** | latest | 三栏可拖拽布局 |
| **zustand** | 5.x | 轻量状态管理 |
| **framer-motion** | 11.x | 动画过渡 |
| **react-markdown** | 9.x | Markdown 渲染 |
| **react-syntax-highlighter** | 16.x | 代码高亮 |

### 3.2 功能开发阶段（Phase 1+，在原型验证后引入）

| 层级 | 技术 | 用途 |
|------|------|------|
| **后端** | Hono 4.x | API 框架 |
| | Claude Agent SDK | Claude 代理 |
| | Anthropic Sandbox Runtime | 隔离沙箱 |
| | MCP SDK 1.25+ | 工具协议 |
| | Zod 4.x | 类型校验 |
| | node-pty | PTY 终端 |
| | chokidar 4.x | 文件监听 |
| **桌面** | Tauri 2.x | 桌面壳 (Rust) |
| | tauri-plugin-sql | SQLite |
| | tauri-plugin-fs | 文件操作 |
| | tauri-plugin-shell | Shell 执行 |
| | tauri-plugin-notification | 系统通知 |
| | tauri-plugin-clipboard | 剪贴板 |
| | tauri-plugin-global-shortcut | 全局快捷键 |
| | tauri-plugin-updater | 自动更新 |
| **CLI** | codex | Codex 代码生成 |
| | claude | Claude Code CLI |
| **新增前端** | @xterm/xterm 5.x | 内嵌终端 |

---

## 四、三栏布局设计

### 4.1 整体结构

```
┌──────────────────────────────────────────────────────────────────────┐
│  ● ● ●     WoaSobi AI Client                    ▶ Open  ◉ Commit  │
├────────────┬─────────────────────────────┬───────────────────────────┤
│            │                             │                           │
│  SIDEBAR   │       CHAT PANEL            │     PREVIEW PANEL         │
│  (280px)   │       (flexible)            │     (flexible)            │
│  可折叠     │       最小 400px            │     可折叠                 │
│            │                             │                           │
│ ┌────────┐ │  ┌───────────────────────┐  │  ┌─────────────────────┐ │
│ │+ Thread│ │  │  User: 帮我写一个...   │  │  │ [Uncommitted Changes]│ │
│ ├────────┤ │  │                       │  │  │  Unstaged | Staged   │ │
│ │⚡ Auto │ │  │  AI: 好的，我来...     │  │  ├─────────────────────┤ │
│ │🔧 Skill│ │  │  ┌─────────────────┐  │  │  │ ● src/app.tsx       │ │
│ │🧰 Tools│ │  │  │ code block...   │  │  │  │   + import React    │ │
│ ├────────┤ │  │  └─────────────────┘  │  │  │   - old code        │ │
│ │        │ │  │                       │  │  │                     │ │
│ │Threads │ │  │  AI: 已完成修改 ✓     │  │  │ ● src/utils.ts      │ │
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

### 4.2 左侧 Sidebar (280px，可折叠至图标模式 48px)

```
┌──────────────────────┐
│ [WoaSobi Logo]       │         ← 品牌标识
├──────────────────────┤
│ + New Thread         │         ← 主操作按钮
├──────────────────────┤
│ ⚡ Automations       │
│ 🔧 Skills            │         ← 快捷功能入口（点击展开二级面板）
│ 🧰 Tools             │
├──────────────────────┤
│ Threads         🔍 ≡ │         ← 搜索 + 排序
│ ┌──────────────────┐ │
│ │ 📂 aipt4          │ │         ← 工作区分组
│ │  ├ Add sidebar..2d│ │
│ │  ├ 我的ai-arco.. 4m│ │         ← 对话条目 (标题 + 时间)
│ │  └ 现在我power.. 4m│ │
│ │ 📂 yizhi5          │ │
│ │  ├ 添加额度展..10h│ │
│ │  ├ Fix shadow.. 10h│ │
│ │  └ 添加老平台.. 2d│ │
│ │ Show more ▾       │ │
│ └──────────────────┘ │
├──────────────────────┤
│ ⚙ Settings  │Upgrade│ │         ← 底部固定
└──────────────────────┘
```

**Skills 二级面板**（点击 Skills 按钮从左侧滑出）
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

**Tools 二级面板**
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

### 4.3 中间 Chat Panel (自适应，最小 400px)

```
┌──────────────────────────────────────┐
│  📝 添加额度展示与审批功能  yizhi5  … │  ← 标题栏 (thread名 + 工作区名)
├──────────────────────────────────────┤
│                                      │
│  ┌─ User ──────────────────────────┐ │
│  │ 脏文件指的是？                    │ │  ← 用户消息
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─ AI ───────────────────────────┐  │
│  │ 指当前 git working tree 里，    │  │
│  │ 除了我这次改动之外，原本就存在   │  │  ← AI 消息 (Markdown)
│  │ 的"未提交变化"。                │  │
│  │                                │  │
│  │ 我看到的是这些（我没动）：       │  │
│  │ • migration.sql                │  │  ← 列表/链接
│  │ • migration.sql                │  │
│  │ • migration_lock.toml          │  │
│  │                                │  │
│  │ ┌─ Tool Call ───────────────┐  │  │
│  │ │ 🔧 read_file              │  │  │  ← 工具调用（可折叠）
│  │ │ path: src/migration.sql   │  │  │
│  │ │ ▾ Show output             │  │  │
│  │ └──────────────────────────┘  │  │
│  │                                │  │
│  │ ```sql                        │  │
│  │ ALTER TABLE users ADD ...     │  │  ← 代码块 (语法高亮)
│  │ ```               [Copy][Apply]│ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌─ User ──────────────────────────┐ │
│  │ 先不着急吧 无密钥也看允许使用     │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─ AI ───────────────────────────┐  │
│  │ 明白，那就保持现状：/public/v1  │  │
│  │ 继续允许无密钥访问；有 sk- 密钥 │  │
│  │ 时才会绑定用户身份和余额扣费。   │  │
│  └────────────────────────────────┘ │
│                                      │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Ask for follow-up changes...     │ │  ← 输入框 (可多行展开)
│ │                                  │ │
│ ├──────────────────────────────────┤ │
│ │[+][Claude-4.5 ▾][Auto ▾][🎤][⬆]│ │  ← 工具栏
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ [💻▾] [😊▾]         [🔀▾] [⏳]     │  ← 底部状态栏
└──────────────────────────────────────┘
```

**输入栏详解**
```
[+]           → 快捷菜单：附件、图片、文件引用、/ 命令
[Claude-4.5 ▾] → 模型选择器下拉
[Auto ▾]      → 执行模式: Auto / Ask / Manual
[🎤]          → 语音输入 (长按录音)
[⬆]           → 发送按钮 (Cmd+Enter)
```

**底部状态栏**
```
[💻▾]  → 终端状态/打开终端
[😊▾]  → 表情/反馈
[🔀▾]  → Git 分支选择
[⏳]   → 任务进度/Token 用量
```

### 4.4 右侧 Preview Panel (可折叠，可拖拽宽度)

**Tab 切换头部**
```
┌────────────────────────────────────┐
│ [Changes] [Artifact] [Terminal]    │
│ [Image]   [Files]                  │
├────────────────────────────────────┤
│           (Tab 内容区)              │
└────────────────────────────────────┘
```

**Tab 1: Code Changes（默认 Tab）**
```
┌────────────────────────────────────┐
│ Uncommitted changes             ▾  │  ← 下拉：All/Uncommitted/Staged
│  [Unstaged] [Staged]         ···   │  ← 切换 + 操作菜单
├────────────────────────────────────┤
│                                    │
│  📄 src/api/billing.ts        [+]  │  ← 文件列表 ([+]暂存)
│  📄 src/middleware/auth.ts    [+]  │
│  📄 prisma/migration.sql      [+]  │
│                                    │
│ ─── diff 预览 ──────────────────── │
│  src/api/billing.ts                │
│  @@ -12,6 +12,15 @@               │
│    import { db } from '../db'      │
│  + import { billing } from './...' │  ← 绿色高亮 (新增)
│  - import { old } from './...'     │  ← 红色高亮 (删除)
│    export function handler() {     │
│                                    │
│  No unstaged changes               │  ← 空状态提示
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
│ │    (iframe 沙箱渲染区)          │ │
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
│        │  生成的图片    │            │
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

### 4.5 响应式折叠策略

| 窗口宽度 | Sidebar | Chat | Preview |
|----------|---------|------|---------|
| >= 1400px | 280px 展开 | 自适应 | 自适应 |
| 1000-1400px | 48px 图标模式 | 自适应 | 自适应 |
| 800-1000px | 48px 图标模式 | 自适应 | 隐藏（底部抽屉） |
| < 800px | 隐藏（汉堡菜单）| 全屏 | 隐藏 |

---

## 五、Phase 0 — 纯前端原型（当前阶段）

### 5.1 目标

- 用 Mock 数据 + 纯前端实现完整的三栏布局交互
- 可在**浏览器中直接运行**（`pnpm dev`），无需 Tauri / 后端
- 所有交互可点击、可体验，验证信息架构和交互流程
- 作为产品设计评审的交付物

### 5.2 原型范围

| 模块 | 要做 | 不做 |
|------|------|------|
| **三栏布局** | 可拖拽面板、折叠/展开、响应式 | - |
| **Sidebar** | Thread 列表、Workspace 分组、Skills/Tools 二级面板 | 真实数据持久化 |
| **Chat** | 消息列表渲染、Markdown/代码块、工具调用展示 | 真实 AI 对话 |
| **Chat 输入** | 多行输入框、模型选择器、模式选择器、发送按钮 | 真实发送/SSE |
| **Preview - Changes** | Git diff 文件列表、Unstaged/Staged 切换、diff 高亮 | 真实 Git 操作 |
| **Preview - Artifact** | iframe 预览占位 | 真实沙箱渲染 |
| **Preview - Terminal** | 终端样式展示 | 真实 PTY |
| **Preview - Image** | 图片展示区域 | 真实 AI 生图 |
| **Preview - Files** | 文件树展示 | 真实文件系统 |
| **设置** | 设置弹窗 UI（各 Tab 布局） | 真实配置持久化 |
| **主题** | Dark / Light 切换 | - |
| **动画** | 面板过渡、消息出现动画 | - |
| **Mock 数据** | 模拟对话、diff、文件树等 | - |

### 5.3 Mock 数据方案

```typescript
// mocks/threads.ts - 模拟对话列表
export const mockThreads: Thread[] = [
  {
    id: 'thread-1',
    title: '添加额度展示与审批功能',
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

// mocks/messages.ts - 模拟对话消息
export const mockMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: '脏文件指的是？',
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: '指当前 git working tree 里，除了我这次改动之外，原本就存在的"未提交变化"。\n\n我看到的是这些（我没动）：\n- migration.sql\n- migration_lock.toml',
    toolCalls: [
      { name: 'read_file', args: { path: 'src/migration.sql' } }
    ],
  },
  // ...
]

// mocks/git-changes.ts - 模拟 Git diff
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

// mocks/skills.ts - 模拟技能列表
// mocks/workspaces.ts - 模拟工作区
// mocks/file-tree.ts - 模拟文件树
```

### 5.4 模拟交互行为

| 交互 | 模拟方式 |
|------|----------|
| 发送消息 | 追加到本地消息列表 → 延迟 1s 后追加一条 mock AI 回复 |
| 流式输出 | 用 `setInterval` 逐字追加 mock AI 文本，模拟打字效果 |
| 切换 Thread | 从 mock 数据中加载对应消息列表 |
| 切换工作区 | 筛选显示对应工作区的 Threads |
| Git Changes | 切换 Unstaged/Staged 时切换 mock 文件列表 |
| Skills 面板 | 点击展开/收起二级面板 |
| 设置弹窗 | Dialog 打开/关闭，Tab 切换 |
| 主题切换 | Tailwind dark mode 切换 |
| 面板拖拽 | react-resizable-panels 真实拖拽 |
| 面板折叠 | 动画过渡折叠/展开 |

### 5.5 原型目录结构

```
workany/src/
├── app/
│   ├── App.tsx                      # 根组件
│   ├── router.tsx                   # 路由（原型仅 / 和 /settings）
│   └── pages/
│       └── Home.tsx                 # 主页面（挂载三栏布局）
│
├── components/
│   ├── ui/                          # shadcn/ui 基础组件
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
│   │   ├── AppLayout.tsx            # 三栏主布局 (ResizablePanelGroup)
│   │   ├── TitleBar.tsx             # 顶部标题栏 (Open/Commit 按钮)
│   │   └── StatusBar.tsx            # 底部状态栏
│   │
│   ├── sidebar/
│   │   ├── Sidebar.tsx              # Sidebar 容器
│   │   ├── SidebarHeader.tsx        # Logo + New Thread 按钮
│   │   ├── QuickActions.tsx         # Automations / Skills / Tools 入口
│   │   ├── ThreadList.tsx           # 对话列表（按工作区分组）
│   │   ├── ThreadItem.tsx           # 单条对话条目
│   │   ├── WorkspaceGroup.tsx       # 工作区分组头
│   │   ├── SkillsPanel.tsx          # Skills 二级面板
│   │   ├── ToolsPanel.tsx           # Tools 二级面板
│   │   ├── AutomationsPanel.tsx     # Automations 二级面板
│   │   └── SidebarFooter.tsx        # Settings + Upgrade
│   │
│   ├── chat/
│   │   ├── ChatPanel.tsx            # Chat 面板容器
│   │   ├── ChatHeader.tsx           # 对话标题栏
│   │   ├── MessageList.tsx          # 消息列表（虚拟滚动预留）
│   │   ├── MessageBubble.tsx        # 消息气泡（User/AI 不同样式）
│   │   ├── MarkdownRenderer.tsx     # Markdown 渲染封装
│   │   ├── CodeBlock.tsx            # 代码块 (高亮 + Copy + Apply)
│   │   ├── ToolCallView.tsx         # 工具调用展示（折叠/展开）
│   │   ├── ChatInput.tsx            # 输入框组件
│   │   ├── ModelSelector.tsx        # 模型选择下拉
│   │   ├── ModeSelector.tsx         # 执行模式选择 (Auto/Ask/Manual)
│   │   └── QuickCommandMenu.tsx     # / 命令快捷菜单
│   │
│   ├── preview/
│   │   ├── PreviewPanel.tsx         # Preview 面板容器 (Tab 切换)
│   │   ├── CodeChangesTab.tsx       # Git Changes Tab
│   │   ├── DiffView.tsx             # Diff 高亮展示
│   │   ├── FileChangeItem.tsx       # 变更文件条目
│   │   ├── ArtifactTab.tsx          # Artifact 预览 Tab
│   │   ├── TerminalTab.tsx          # 终端输出 Tab
│   │   ├── ImageTab.tsx             # 图片预览 Tab
│   │   └── FilesTab.tsx             # 文件浏览器 Tab
│   │
│   ├── settings/
│   │   ├── SettingsDialog.tsx       # 设置弹窗
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
│       ├── Avatar.tsx               # 用户/AI 头像
│       ├── EmptyState.tsx           # 空状态占位
│       └── Badge.tsx                # 标签组件
│
├── stores/
│   ├── chat.ts                      # 对话状态 (Zustand)
│   ├── workspace.ts                 # 工作区状态
│   ├── ui.ts                        # UI 状态 (面板折叠、主题等)
│   ├── preview.ts                   # 预览面板状态
│   └── index.ts
│
├── mocks/
│   ├── threads.ts                   # Mock 对话列表
│   ├── messages.ts                  # Mock 消息数据
│   ├── git-changes.ts              # Mock Git diff
│   ├── workspaces.ts               # Mock 工作区
│   ├── skills.ts                    # Mock 技能列表
│   ├── tools.ts                     # Mock 工具列表
│   ├── file-tree.ts                # Mock 文件树
│   └── index.ts                     # 统一导出
│
├── shared/
│   ├── types/
│   │   ├── thread.ts               # Thread 类型
│   │   ├── message.ts              # Message 类型
│   │   ├── workspace.ts            # Workspace 类型
│   │   ├── git.ts                  # Git 相关类型
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useSimulatedChat.ts     # 模拟对话 hook
│   │   ├── useTheme.ts             # 主题切换 hook
│   │   └── usePanelLayout.ts       # 面板布局 hook
│   ├── lib/
│   │   └── utils.ts                # 工具函数 (cn, formatTime 等)
│   └── providers/
│       ├── theme-provider.tsx
│       └── store-provider.tsx
│
└── config/
    ├── style/
    │   └── global.css              # 全局样式 + CSS 变量
    └── constants.ts                 # 常量定义
```

### 5.6 原型里程碑

| 里程碑 | 时间 | 交付物 | 验收标准 |
|--------|------|--------|----------|
| **P0-M1: 布局骨架** | Day 1-2 | 三栏可拖拽布局 + 空壳组件 | 面板可拖拽调整宽度，可折叠/展开 |
| **P0-M2: Sidebar** | Day 3-4 | Thread 列表 + 工作区分组 + 二级面板 | 点击切换 Thread，Skills/Tools 面板可展开 |
| **P0-M3: Chat** | Day 5-7 | 消息渲染 + 输入框 + 模拟对话 | Markdown/代码块正确渲染，模拟流式输出 |
| **P0-M4: Preview** | Day 8-10 | 5 个 Tab 全部实现 | Changes/Artifact/Terminal/Image/Files 可切换 |
| **P0-M5: 打磨** | Day 11-12 | 动画 + 主题 + 设置弹窗 + 响应式 | Dark/Light 切换，各断点正常显示 |
| **P0-M6: 评审** | Day 13-14 | 产品设计评审 + 修改 | 收集反馈，确定最终方案 |

---

## 六、Phase 1 — 核心功能开发（原型验证后）

> 在 Phase 0 原型评审通过后，将 Mock 替换为真实后端

### 6.1 目标

将原型升级为可用的桌面客户端，接入真实 AI 后端和 CLI。

### 6.2 功能清单

| 模块 | 功能点 | 优先级 |
|------|--------|--------|
| **后端 API** | Hono 服务启动，SSE 流式通信 | P0 |
| **CLI 集成** | Codex / Claude CLI 进程管理 (PTY) | P0 |
| **模型管理** | 多 Provider 配置 (Anthropic/OpenAI/Custom) | P0 |
| **真实对话** | 替换 Mock → 真实 AI 对话 + 流式渲染 | P0 |
| **工作区绑定** | 项目目录选择 + Git 仓库检测 | P0 |
| **Git Changes** | 真实 Git diff 读取 + 文件暂存 | P0 |
| **本地存储** | SQLite 持久化对话/设置/工作区 | P0 |
| **Tauri 打包** | 桌面应用构建 (macOS/Linux/Windows) | P0 |
| **设置持久化** | API Key / Provider / 偏好配置 | P1 |
| **代码 Apply** | 将 AI 代码块应用到文件 | P1 |

### 6.3 数据库 Schema

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

## 七、Phase 2 — 能力增强

| 模块 | 功能点 |
|------|--------|
| **Skills 系统** | 预置技能 + 自定义 Skill 编辑器 |
| **Automations** | 自动化工作流（触发器 + 动作链）|
| **MCP 集成** | MCP Server 管理，Tool 注册/调用 |
| **内嵌终端** | xterm.js 真实终端，多 Tab |
| **Artifact 预览** | HTML/React iframe 沙箱渲染 |
| **Commit 助手** | AI 生成 commit message，一键提交 |
| **Git 操作** | Commit / Push / Pull / Branch UI |
| **文件浏览** | 工作区文件树 + 搜索 |

---

## 八、Phase 3 — 多模态扩展

| 模块 | 功能点 |
|------|--------|
| **通用对话** | 纯 Chat 模式（无 Agent） |
| **图片生成** | DALL-E / Stable Diffusion / Midjourney API |
| **图片理解** | 上传图片 + 多模态分析 |
| **文件处理** | PDF/Excel/Word 解析 |
| **语音输入** | Whisper 语音转文字 |
| **TTS 输出** | AI 回复语音朗读 |
| **插件市场** | 第三方插件安装/管理 |

---

## 九、核心架构（全量）

### 9.1 进程架构

```
┌──────────────────────────────────────────────┐
│                 Tauri 主进程 (Rust)           │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ 窗口管理  │  │ 文件系统  │  │ Shell 执行  │ │
│  │ 系统通知  │  │ SQLite   │  │ 全局快捷键  │ │
│  └──────────┘  └──────────┘  └────────────┘ │
├──────────────────────────────────────────────┤
│              WebView (前端渲染)                │
│  ┌────────────────────────────────────────┐  │
│  │  React App (Sidebar + Chat + Preview)  │  │
│  │  ┌──────┐  ┌────────┐  ┌───────────┐  │  │
│  │  │Zustand│  │Router  │  │ xterm.js  │  │  │
│  │  │ Store │  │ Pages  │  │ Terminal  │  │  │
│  │  └──────┘  └────────┘  └───────────┘  │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│              API 子进程 (Node.js)              │
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
│              外部 CLI 进程                     │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │ codex CLI  │  │ claude CLI             │  │
│  │ (PTY)      │  │ (PTY)                  │  │
│  └────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 9.2 数据流

```
用户输入
  │
  ▼
前端 (React) ──SSE──▶ API (Hono)
  │                      │
  │                  ┌───┴───┐
  │                  ▼       ▼
  │            Agent SDK   CLI 进程
  │            (直接API)   (codex/claude)
  │                  │       │
  │                  ▼       ▼
  │             AI Provider (Anthropic/OpenAI/...)
  │                  │       │
  │                  ▼       ▼
  │◀────SSE────── 流式响应 ──┘
  │
  ▼
Zustand Store 状态更新
  │
  ├──▶ Chat Panel (消息渲染)
  ├──▶ Preview Panel (diff/artifact 更新)
  └──▶ Sidebar (thread 状态更新)
```

---

## 十、UI/UX 设计规范

### 10.1 配色

```css
/* Dark Theme (默认) */
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

### 10.2 字体

| 用途 | 字体 |
|------|------|
| UI 文字 | Inter / system-ui |
| 代码 | JetBrains Mono / Fira Code |
| 中文 | PingFang SC / Noto Sans CJK |

### 10.3 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+N` | 新建对话 |
| `Cmd+K` | 全局搜索 |
| `Cmd+Enter` | 发送消息 |
| `Cmd+Shift+P` | 命令面板 |
| `Cmd+B` | 切换侧边栏 |
| `Cmd+J` | 切换预览面板 |
| `` Cmd+` `` | 切换终端 |
| `Cmd+1/2/3` | 切换预览 Tab |

---

## 十一、竞品参考

| 产品 | 亮点 | 可借鉴 |
|------|------|--------|
| **Codex Desktop** (截图原型) | 三栏布局、Git 集成、Skills | 布局结构、Git Changes 面板 |
| **Cursor** | AI 代码编辑器、inline diff | Apply 按钮、diff 预览 |
| **Windsurf** | Cascade 流式对话 | 流式 UI 体验 |
| **Claude Desktop** | Artifact 预览、MCP | Artifact 渲染 |
| **Warp** | AI 终端、Block 模式 | 终端集成 |

---

## 十二、风险与应对

| 风险 | 应对策略 |
|------|----------|
| CLI 进程管理复杂 | PTY 统一管理 + 超时清理 + 进程池 |
| 多模型 API 格式差异 | Provider 抽象层 + Adapter 模式 |
| 大文件 diff 性能 | 虚拟滚动 + Web Worker 解析 |
| Tauri WebView 兼容 | 标准 Web API，CI 多平台测试 |
| API Key 安全 | Tauri Keyring 加密存储 |

---

## 总结：开发路径

```
┌─────────────────────────────────────────────────┐
│  Phase 0: 纯前端原型 (2 周)                       │
│  ✦ 三栏布局 + Mock 数据 + 全部 UI 交互            │
│  ✦ 浏览器直接运行，零后端依赖                      │
│  ✦ 产品设计评审 → 确认最终方案                     │
├─────────────────────────────────────────────────┤
│  Phase 1: 核心功能 (4-6 周)                       │
│  ✦ Mock → 真实后端 (Hono + Agent SDK)             │
│  ✦ Codex / Claude CLI 集成                       │
│  ✦ SQLite 持久化 + Tauri 打包                     │
├─────────────────────────────────────────────────┤
│  Phase 2: 能力增强 (4-6 周)                       │
│  ✦ Skills + MCP + Terminal + Git 操作             │
├─────────────────────────────────────────────────┤
│  Phase 3: 多模态 (4-6 周)                         │
│  ✦ 通用对话 + 生图 + 图片理解 + 文件处理           │
├─────────────────────────────────────────────────┤
│  Phase 4+: 持续迭代                               │
│  ✦ 插件市场 + 团队协作 + 性能优化                  │
└─────────────────────────────────────────────────┘
```

> 📌 **当前行动：启动 Phase 0，用 2 周时间交付可体验的纯前端原型。**
