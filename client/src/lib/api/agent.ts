import { API_BASE_URL } from '@/config/api';

export interface AgentRequestOptions {
  provider: 'claude' | 'codex';
  modelConfig?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
  conversation?: Array<{ role: 'user' | 'assistant'; content: string }>;
  signal?: AbortSignal;
}

export interface SSEMessage {
  type: 'session' | 'text' | 'tool_use' | 'tool_result' | 'result' | 'error' | 'done';
  sessionId?: string;
  content?: string;
  id?: string;
  name?: string;
  input?: unknown;
  toolUseId?: string;
  output?: string;
  isError?: boolean;
  cost?: number;
  duration?: number;
  message?: string;
}

/**
 * Send agent request and return the Response for SSE streaming
 */
export async function sendAgentRequest(
  prompt: string,
  options: AgentRequestOptions
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      provider: options.provider,
      modelConfig: options.modelConfig,
      conversation: options.conversation,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Stop a running agent session
 */
export async function stopAgent(sessionId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/agent/stop/${sessionId}`, {
    method: 'POST',
  });
}

export interface HealthStatus {
  ok: boolean;
  clis?: {
    claude: boolean;
    codex: boolean;
  };
}

/**
 * Check backend health and CLI availability
 */
export async function checkHealth(): Promise<HealthStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return { ok: false };
    const data = await response.json();
    return {
      ok: true,
      clis: data.clis,
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Parse SSE stream from response, invoking callback for each message
 */
export async function parseSSEStream(
  response: Response,
  onMessage: (message: SSEMessage) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6)) as SSEMessage;
          onMessage(data);
        } catch {
          // Skip malformed JSON
        }
      }
    }

    // Process remaining buffer
    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6)) as SSEMessage;
        onMessage(data);
      } catch {
        // Skip
      }
    }
  } finally {
    reader.releaseLock();
  }
}
