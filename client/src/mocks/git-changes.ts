import type { GitChange } from "@/types";

export const mockGitChanges: GitChange[] = [
  {
    file: "src/api/billing.ts", status: "modified", staged: false, additions: 15, deletions: 3,
    diff: `@@ -12,6 +12,21 @@\n import { db } from '../db';\n import { Hono } from 'hono';\n+import { BillingService } from '../services/billing';\n+import { validateApiKey } from '../middleware/auth';\n \n const billing = new Hono();\n \n+billing.get('/quota', validateApiKey, async (c) => {\n+  const userId = c.get('userId');\n+  const quota = await BillingService.getQuota(userId);\n+  return c.json({ success: true, data: quota });\n+});\n \n export default billing;`,
  },
  {
    file: "src/middleware/auth.ts", status: "modified", staged: false, additions: 8, deletions: 2,
    diff: `@@ -1,7 +1,13 @@\n import type { Context, Next } from 'hono';\n+import { verifyToken } from '../utils/jwt';\n \n-export async function validateApiKey(c: Context, next: Next) {\n+export const validateApiKey = async (c: Context, next: Next) => {\n   const apiKey = c.req.header('Authorization');\n-  if (!apiKey) return c.json({ error: 'Unauthorized' }, 401);\n+  if (!apiKey?.startsWith('sk-')) {\n+    return c.json({ error: 'Invalid API key' }, 401);\n+  }\n+  const user = await verifyToken(apiKey);\n+  c.set('userId', user.id);\n   await next();\n-}`,
  },
  {
    file: "prisma/migrations/20260206_add_billing/migration.sql", status: "added", staged: true, additions: 22, deletions: 0,
    diff: `+-- CreateTable\n+CREATE TABLE "BillingQuota" (\n+    "id" TEXT NOT NULL,\n+    "userId" TEXT NOT NULL,\n+    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,\n+    "usedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,\n+    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,\n+    CONSTRAINT "BillingQuota_pkey" PRIMARY KEY ("id")\n+);`,
  },
  {
    file: "src/services/billing.ts", status: "added", staged: true, additions: 18, deletions: 0,
    diff: `+import { db } from '../db';\n+\n+export class BillingService {\n+  static async getQuota(userId: string) {\n+    return db.billingQuota.findFirst({ where: { userId } });\n+  }\n+\n+  static async approve(requestId: string, amount: number) {\n+    return db.billingApproval.update({\n+      where: { id: requestId },\n+      data: { status: 'approved', amount },\n+    });\n+  }\n+}`,
  },
  {
    file: "migration_lock.toml", status: "modified", staged: false, additions: 1, deletions: 1,
    diff: `@@ -1,3 +1,3 @@\n # This file is auto-generated\n-provider = "postgresql"\n+provider = "postgresql"  # Updated`,
  },
];
