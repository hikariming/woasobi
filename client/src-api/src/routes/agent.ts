import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { runClaude, stopClaudeSession } from '../agents/claude.js';
import { runCodex, stopCodexSession } from '../agents/codex.js';
import { createSSEStream, SSE_HEADERS } from '../utils/sse.js';
import type { AgentRequest, AgentMessage } from '../agents/types.js';
import { appendMessage, updateThreadAfterMessage, type StoredMessage } from '../storage/index.js';

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
  let cost: number | undefined;
  let duration: number | undefined;
  let hasError = false;

  for await (const msg of gen) {
    // Accumulate while passing through
    switch (msg.type) {
      case 'text':
        if (msg.content) fullText += msg.content;
        break;
      case 'tool_use':
        if (msg.name && msg.id) {
          toolCalls.push({
            id: msg.id,
            name: msg.name,
            args: (msg.input as Record<string, unknown>) || {},
          });
        }
        break;
      case 'tool_result':
        if (msg.toolUseId) {
          const tc = toolCalls.find((t) => t.id === msg.toolUseId);
          if (tc) tc.output = msg.output;
        }
        break;
      case 'result':
        cost = msg.cost;
        duration = msg.duration;
        break;
      case 'error':
        hasError = true;
        if (msg.message) fullText += fullText ? `\n\nError: ${msg.message}` : `Error: ${msg.message}`;
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
    generator = runClaude(body.prompt, config, body.conversation);
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
