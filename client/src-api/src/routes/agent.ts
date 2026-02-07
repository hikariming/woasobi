import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { runClaude, stopClaudeSession, getCachedClaudeCommands } from '../agents/claude.js';
import { runCodex, stopCodexSession } from '../agents/codex.js';
import { createSSEStream, SSE_HEADERS } from '../utils/sse.js';
import type { AgentRequest, AgentMessage } from '../agents/types.js';
import { appendMessage, updateThreadAfterMessage, type StoredMessage, type StoredMessagePart } from '../storage/index.js';

const agent = new Hono();

/**
 * Wraps an agent generator to persist messages to disk when threadId is provided.
 * Passes all events through transparently while accumulating the assistant response.
 */
async function* persistingWrapper(
  gen: AsyncGenerator<AgentMessage>,
  threadId: string,
  userMessageId: string,
  userContent: string
): AsyncGenerator<AgentMessage> {
  // Persist user message first
  const userMsg: StoredMessage = {
    id: userMessageId,
    role: 'user',
    content: userContent,
    timestamp: new Date().toISOString(),
  };
  await appendMessage(threadId, userMsg);

  // Accumulate assistant response
  let fullText = '';
  const toolCalls: StoredMessage['toolCalls'] = [];
  const parts: StoredMessagePart[] = [];
  let cost: number | undefined;
  let duration: number | undefined;
  let hasError = false;

  for await (const msg of gen) {
    // Accumulate while passing through
    switch (msg.type) {
      case 'text':
        if (msg.content) {
          fullText += msg.content;
          // Append to last text part or create new one
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart.type === 'text') {
            lastPart.content += msg.content;
          } else {
            parts.push({ type: 'text', content: msg.content });
          }
        }
        break;
      case 'tool_use':
        if (msg.name && msg.id) {
          const tc = {
            id: msg.id,
            name: msg.name,
            args: (msg.input as Record<string, unknown>) || {},
          };
          toolCalls.push(tc);
          parts.push({ type: 'tool_use', ...tc });
        }
        break;
      case 'tool_result':
        if (msg.toolUseId) {
          const tc = toolCalls.find((t) => t.id === msg.toolUseId);
          if (tc) tc.output = msg.output;
          // Also update the part
          const part = parts.find((p) => p.type === 'tool_use' && p.id === msg.toolUseId);
          if (part && part.type === 'tool_use') {
            part.output = msg.output;
            part.isError = msg.isError;
          }
        }
        break;
      case 'result':
        cost = msg.cost;
        duration = msg.duration;
        break;
      case 'error':
        hasError = true;
        if (msg.message) {
          const errText = fullText ? `\n\nError: ${msg.message}` : `Error: ${msg.message}`;
          fullText += errText;
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart.type === 'text') {
            lastPart.content += errText;
          } else {
            parts.push({ type: 'text', content: errText });
          }
        }
        break;
    }

    yield msg;

    // On done, persist assistant message
    if (msg.type === 'done' && fullText) {
      const assistantMsg: StoredMessage = {
        id: `m-${nanoid(6)}`,
        role: 'assistant',
        content: fullText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        parts: parts.length > 0 ? parts : undefined,
        timestamp: new Date().toISOString(),
        cost,
        duration,
        isError: hasError,
      };
      await appendMessage(threadId, assistantMsg);
      await updateThreadAfterMessage(threadId);
    }
  }
}

// Default Claude commands before any session provides live data
const DEFAULT_CLAUDE_COMMANDS = [
  { name: 'compact', description: 'Compact conversation context', argumentHint: '' },
  { name: 'review', description: 'Code review', argumentHint: '' },
  { name: 'init', description: 'Initialize a CLAUDE.md file', argumentHint: '' },
  { name: 'login', description: 'Log in to your account', argumentHint: '' },
  { name: 'logout', description: 'Log out', argumentHint: '' },
  { name: 'doctor', description: 'Diagnose issues', argumentHint: '' },
  { name: 'memory', description: 'Edit CLAUDE.md', argumentHint: '' },
  { name: 'config', description: 'Edit config', argumentHint: '' },
  { name: 'cost', description: 'Show cost information', argumentHint: '' },
  { name: 'permissions', description: 'View and manage permissions', argumentHint: '' },
];

const CODEX_COMMANDS = [
  { name: 'help', description: 'Show available commands', argumentHint: '' },
  { name: 'model', description: 'Change the model', argumentHint: '<model-name>' },
  { name: 'approval', description: 'Change approval mode', argumentHint: '<mode>' },
  { name: 'undo', description: 'Undo last file changes', argumentHint: '' },
  { name: 'clear', description: 'Clear conversation history', argumentHint: '' },
  { name: 'history', description: 'Show conversation history', argumentHint: '' },
  { name: 'compact', description: 'Compact conversation context', argumentHint: '' },
];

// Get available slash commands for a provider
agent.get('/commands/:provider', (c) => {
  const provider = c.req.param('provider');
  if (provider === 'codex') {
    return c.json(CODEX_COMMANDS);
  }
  // Claude: use cached from live session, or defaults
  const cached = getCachedClaudeCommands();
  if (cached && cached.length > 0) {
    return c.json(cached);
  }
  return c.json(DEFAULT_CLAUDE_COMMANDS);
});

// Direct execution
agent.post('/', async (c) => {
  const body = await c.req.json<AgentRequest>();

  console.log('[API] POST /agent', {
    provider: body.provider,
    hasPrompt: !!body.prompt,
    hasModelConfig: !!body.modelConfig,
    conversationLength: body.conversation?.length || 0,
    threadId: body.threadId || null,
  });

  if (!body.prompt) {
    return c.json({ error: 'prompt is required' }, 400);
  }

  const provider = body.provider || 'claude';
  const config = {
    provider,
    apiKey: body.modelConfig?.apiKey,
    baseUrl: body.modelConfig?.baseUrl,
    model: body.modelConfig?.model,
  } as const;

  let generator: AsyncGenerator<AgentMessage>;
  if (provider === 'codex') {
    generator = runCodex(body.prompt, config);
  } else {
    generator = runClaude(body.prompt, config, body.conversation, body.permissionMode);
  }

  // Wrap with persistence if threadId provided
  if (body.threadId) {
    const messageId = body.messageId || `m-${nanoid(6)}`;
    generator = persistingWrapper(generator, body.threadId, messageId, body.prompt);
  }

  const readable = createSSEStream(generator);
  return new Response(readable, { headers: SSE_HEADERS });
});

// Stop a running agent
agent.post('/stop/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');

  const stopped = stopClaudeSession(sessionId) || stopCodexSession(sessionId);

  if (!stopped) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ status: 'stopped' });
});

export default agent;
