export interface Project {
  id: string;
  name: string;
  path: string;
  source: "manual" | "claude" | "codex" | "claude+codex";
  addedAt: string;
  pinned?: boolean;
}

/** @deprecated Use Project instead */
export type Workspace = Project;

export interface Thread {
  id: string;
  projectId: string;
  title: string;
  mode: "claudeCode" | "codex";
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  sourcePath?: string; // Path to original CLI session file (imported)
}

export type MessageRole = "user" | "assistant";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  output?: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  timestamp: string;
  cost?: number;
  duration?: number;
  isError?: boolean;
  attachedFiles?: string[];
}

export type FileStatus = "modified" | "added" | "deleted";

export interface GitChange {
  file: string;
  status: FileStatus;
  staged: boolean;
  additions: number;
  deletions: number;
  diff: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  ext?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export type PreviewTab = "changes" | "artifacts" | "terminal" | "images" | "files";
