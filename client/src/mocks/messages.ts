import type { Message } from "@/types";

export const mockMessages: Record<string, Message[]> = {
  "t-4": [
    { id: "m1", threadId: "t-4", role: "user", content: "脏文件指的是？", timestamp: "10h ago" },
    {
      id: "m2", threadId: "t-4", role: "assistant", timestamp: "10h ago",
      content: "指当前 git working tree 里，除了我这次改动之外，原本就存在的\"未提交变化\"。\n\n我看到的是这些（我没动）：\n\n- `migration.sql`\n- `migration.sql`\n- `migration_lock.toml`\n\n\"脏文件\"不一定是坏文件，只是 Git 视角下\"当前有改动/未跟踪，尚未提交\"。",
      toolCalls: [{ id: "tc1", name: "bash", args: { command: "git status --porcelain" }, output: "M  prisma/migrations/migration.sql\n?? prisma/migrations/20260206_add_billing/" }],
    },
    { id: "m3", threadId: "t-4", role: "user", content: "先不着急吧 无密钥也看允许使用", timestamp: "10h ago" },
    { id: "m4", threadId: "t-4", role: "assistant", content: "明白，那就保持现状：`/public/v1` 继续允许无密钥访问；有 `sk-` 密钥时才会绑定用户身份和余额扣费。", timestamp: "10h ago" },
  ],
  "t-5": [
    { id: "m5", threadId: "t-5", role: "user", content: "Fix the shadow database migration error in the prisma setup", timestamp: "10h ago" },
    {
      id: "m6", threadId: "t-5", role: "assistant", timestamp: "10h ago",
      content: "I'll investigate the shadow database migration error.\n\nThe issue is the shadow database URL is not configured. Fix `prisma/schema.prisma`:\n\n```prisma\ndatasource db {\n  provider          = \"postgresql\"\n  url               = env(\"DATABASE_URL\")\n  shadowDatabaseUrl = env(\"SHADOW_DATABASE_URL\")\n}\n```\n\nAnd add to `.env`:\n\n```env\nSHADOW_DATABASE_URL=\"postgresql://user:pass@localhost:5432/shadow_db\"\n```",
      toolCalls: [
        { id: "tc2", name: "read_file", args: { path: "prisma/schema.prisma" }, output: "datasource db {\n  provider = \"postgresql\"\n  url = env(\"DATABASE_URL\")\n}" },
        { id: "tc3", name: "edit_file", args: { path: "prisma/schema.prisma" } },
      ],
    },
  ],
  "t-9": [
    { id: "m7", threadId: "t-9", role: "user", content: "帮我参考这个原型和workany的技术栈，帮我规划一个桌面客户端", timestamp: "1h ago" },
    { id: "m8", threadId: "t-9", role: "assistant", content: "规划文档已写好，保存在 `PLAN.md`。\n\n**技术栈**：Tauri 2 + React 19 + Hono + Vite 7 + shadcn/ui + zustand\n\n**三栏布局**：\n- **左栏 (280px)**：Thread/Workspace 列表\n- **中栏 (自适应)**：对话消息流\n- **右栏 (可折叠)**：Code Changes / Artifact / Terminal", timestamp: "1h ago" },
  ],
};

export const mockStreamText = "好的，我来帮你分析这个问题。\n\n首先让我查看一下相关代码：\n\n```typescript\nimport { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 1420 },\n});\n```\n\n看起来配置文件是正确的。问题出在端口冲突上，你可以尝试修改端口号。";
