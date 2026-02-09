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

/** Ordered content part — preserves interleaving of text and tool calls */
export type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'tool_use'; id: string; name: string; args: Record<string, unknown>; output?: string; isError?: boolean };

export interface Message {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  /** Ordered parts preserving text ↔ tool interleaving (preferred over content+toolCalls) */
  parts?: MessagePart[];
  timestamp: string;
  cost?: number;
  duration?: number;
  isError?: boolean;
  attachedFiles?: string[];
}

export type FileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked";

export interface GitChange {
  file: string;
  origFile?: string;
  status: FileStatus;
  staged: boolean;
  additions: number;
  deletions: number;
  diff: string;
}

export type GitChangeAction = "stage" | "unstage" | "revert";

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

export type ArtifactStatus = "ready" | "loading" | "error";
export type ArtifactViewport = "desktop" | "tablet" | "mobile";

export interface ArtifactItem {
  id: string;
  title: string;
  html: string;
  status: ArtifactStatus;
  updatedAt: string;
}

export interface TerminalLine {
  id: string;
  type: "cmd" | "out" | "err" | "info";
  text: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  lines: TerminalLine[];
  /** Project ID — if set, this is an interactive shell session (xterm.js + WebSocket) */
  projectId?: string;
}

export interface PreviewImageItem {
  id: string;
  prompt: string;
  model: string;
  size: string;
  url: string;
  createdAt: string;
}

export type PreviewFileSelectionSource = "changes" | "files" | "artifact";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
}

export type PreviewTab = "changes" | "artifacts" | "terminal" | "images" | "files";
