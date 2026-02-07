import { Hono } from 'hono';
import { runClaude, stopClaudeSession } from '../agents/claude.js';
import { runCodex, stopCodexSession } from '../agents/codex.js';
import { createSSEStream, SSE_HEADERS } from '../utils/sse.js';
import type { AgentRequest } from '../agents/types.js';

const agent = new Hono();

// Direct execution
agent.post('/', async (c) => {
  const body = await c.req.json<AgentRequest>();

  console.log('[API] POST /agent', {
    provider: body.provider,
    hasPrompt: !!body.prompt,
    hasModelConfig: !!body.modelConfig,
    conversationLength: body.conversation?.length || 0,
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

  let generator;
  if (provider === 'codex') {
    generator = runCodex(body.prompt, config);
  } else {
    generator = runClaude(body.prompt, config, body.conversation);
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
