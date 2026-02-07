export interface Workspace {
  id: string;
  name: string;
  path: string;
}

export interface Thread {
  id: string;
  title: string;
  workspaceId: string;
  model: string;
  mode: "agent" | "chat" | "ask";
  updatedAt: string;
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
