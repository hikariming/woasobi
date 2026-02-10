export type AgentMessageType =
  | 'session'
  | 'init'
  | 'status'
  | 'text'
  | 'tool_use'
  | 'tool_result'
  | 'result'
  | 'error'
  | 'done';

export interface AgentMessage {
  type: AgentMessageType;
  sessionId?: string;
  content?: string;
  // tool_use fields
  id?: string;
  name?: string;
  input?: unknown;
  // tool_result fields
  toolUseId?: string;
  output?: string;
  isError?: boolean;
  // result fields
  cost?: number;
  duration?: number;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  // error fields
  message?: string;
  // init/status fields
  permissionMode?: string;
  slashCommands?: string[];
  statusText?: string;
  awaitingPermission?: boolean;
}

export interface AgentConfig {
  provider: 'claude' | 'codex';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  cwd?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentRequest {
  prompt: string;
  provider: 'claude' | 'codex';
  modelConfig?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  conversation?: ConversationMessage[];
  threadId?: string;
  messageId?: string;
  permissionMode?: string;
  projectId?: string;
}
