import type { FileTreeNode } from "@/types";

export const mockFileTree: FileTreeNode[] = [
  {
    name: "src", path: "src", type: "directory",
    children: [
      {
        name: "api", path: "src/api", type: "directory",
        children: [
          { name: "billing.ts", path: "src/api/billing.ts", type: "file", ext: "ts" },
          { name: "auth.ts", path: "src/api/auth.ts", type: "file", ext: "ts" },
          { name: "users.ts", path: "src/api/users.ts", type: "file", ext: "ts" },
        ],
      },
      {
        name: "components", path: "src/components", type: "directory",
        children: [
          { name: "Dashboard.tsx", path: "src/components/Dashboard.tsx", type: "file", ext: "tsx" },
          { name: "QuotaCard.tsx", path: "src/components/QuotaCard.tsx", type: "file", ext: "tsx" },
        ],
      },
      {
        name: "middleware", path: "src/middleware", type: "directory",
        children: [
          { name: "auth.ts", path: "src/middleware/auth.ts", type: "file", ext: "ts" },
        ],
      },
      {
        name: "services", path: "src/services", type: "directory",
        children: [
          { name: "billing.ts", path: "src/services/billing.ts", type: "file", ext: "ts" },
        ],
      },
      { name: "App.tsx", path: "src/App.tsx", type: "file", ext: "tsx" },
    ],
  },
  {
    name: "prisma", path: "prisma", type: "directory",
    children: [
      { name: "schema.prisma", path: "prisma/schema.prisma", type: "file", ext: "prisma" },
      {
        name: "migrations", path: "prisma/migrations", type: "directory",
        children: [
          { name: "migration.sql", path: "prisma/migrations/migration.sql", type: "file", ext: "sql" },
        ],
      },
    ],
  },
  { name: "package.json", path: "package.json", type: "file", ext: "json" },
  { name: "tsconfig.json", path: "tsconfig.json", type: "file", ext: "json" },
];
