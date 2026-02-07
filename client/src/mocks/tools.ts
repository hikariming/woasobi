import type { Tool } from "@/types";

export const mockTools: Tool[] = [
  { id: "tl1", name: "Terminal", description: "Run shell commands", icon: "Terminal" },
  { id: "tl2", name: "File Explorer", description: "Browse workspace files", icon: "FolderOpen" },
  { id: "tl3", name: "Git Operations", description: "Commit, push, pull, branch", icon: "GitBranch" },
  { id: "tl4", name: "MCP Servers", description: "Manage MCP servers", icon: "Plug" },
];
