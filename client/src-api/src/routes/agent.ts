import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { runClaude, stopClaudeSession, getCachedClaudeCommands, discoverClaudeCommands } from '../agents/claude.js';
import { runCodex, stopCodexSession } from '../agents/codex.js';
import { createSSEStream, SSE_HEADERS } from '../utils/sse.js';
import type { AgentRequest, AgentMessage } from '../agents/types.js';
import { appendMessage, updateThreadAfterMessage, loadProjects, type StoredMessage, type StoredMessagePart } from '../storage/index.js';

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

// Comprehensive Claude Code slash commands with descriptions.
// Dynamically discovered commands from init events are merged on top of this.
const DEFAULT_CLAUDE_COMMANDS = [
  { name: 'help', description: 'Show available commands', argumentHint: '' },
  { name: 'compact', description: 'Compact conversation context', argumentHint: '[instructions]' },
  { name: 'clear', description: 'Clear conversation history', argumentHint: '' },
  { name: 'review', description: 'Code review', argumentHint: '' },
  { name: 'usage', description: 'Show token usage information', argumentHint: '' },
  { name: 'cost', description: 'Show cost information', argumentHint: '' },
  { name: 'model', description: 'Show or change the model', argumentHint: '[model-name]' },
  { name: 'permissions', description: 'View and manage permissions', argumentHint: '[mode]' },
  { name: 'init', description: 'Initialize a CLAUDE.md file', argumentHint: '' },
  { name: 'memory', description: 'Edit CLAUDE.md', argumentHint: '' },
  { name: 'config', description: 'Edit config', argumentHint: '' },
  { name: 'login', description: 'Log in to your account', argumentHint: '' },
  { name: 'logout', description: 'Log out', argumentHint: '' },
  { name: 'doctor', description: 'Diagnose issues', argumentHint: '' },
  { name: 'bug', description: 'Report a bug', argumentHint: '' },
  { name: 'status', description: 'Show current session status', argumentHint: '' },
  { name: 'mcp', description: 'Show MCP server status', argumentHint: '' },
  { name: 'allowed-tools', description: 'Manage allowed tools', argumentHint: '' },
  { name: 'terminal', description: 'Open a terminal', argumentHint: '' },
  { name: 'vim', description: 'Toggle vim keybindings', argumentHint: '' },
  { name: 'theme', description: 'Change the theme', argumentHint: '[theme-name]' },
  { name: 'undo', description: 'Undo last file changes', argumentHint: '' },
  { name: 'diff', description: 'Show recent code changes', argumentHint: '' },
  { name: 'pr-comments', description: 'Show PR review comments', argumentHint: '' },
  { name: 'search', description: 'Search the codebase', argumentHint: '<query>' },
  { name: 'add-dir', description: 'Add a directory to context', argumentHint: '<path>' },
];

// Build a description lookup so we can enrich discovered commands that only have names
const COMMAND_DESC_MAP = new Map(
  DEFAULT_CLAUDE_COMMANDS.map(c => [c.name, { description: c.description, argumentHint: c.argumentHint }])
);

const CODEX_COMMANDS = [
  { name: 'help', description: 'Show available commands', argumentHint: '' },
  { name: 'usage', description: 'Show token usage from latest Codex turn', argumentHint: '' },
  { name: 'model', description: 'Change the model', argumentHint: '<model-name>' },
  { name: 'approval', description: 'Change approval mode', argumentHint: '<mode>' },
  { name: 'undo', description: 'Undo last file changes', argumentHint: '' },
  { name: 'clear', description: 'Clear conversation history', argumentHint: '' },
  { name: 'history', description: 'Show conversation history', argumentHint: '' },
  { name: 'compact', description: 'Compact conversation context', argumentHint: '' },
];

const DEFAULT_CODEX_MODELS = [
  { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex', provider: 'OpenAI' },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
];

async function loadCodexCachedModels() {
  try {
    const cachePath = join(homedir(), '.codex', 'models_cache.json');
    const raw = await readFile(cachePath, 'utf-8');
    const json = JSON.parse(raw) as {
      models?: Array<{
        slug?: string;
        display_name?: string;
        visibility?: string;
      }>;
    };

    const models = (json.models || [])
      .filter((m) => m.visibility !== 'hidden')
      .map((m) => {
        const id = m.slug || '';
        const name = m.display_name || id;
        return { id, name, provider: 'OpenAI' as const };
      })
      .filter((m) => m.id.length > 0);

    return models;
  } catch {
    return [];
  }
}

function normalizeBaseUrl(baseUrl?: string) {
  const trimmed = (baseUrl || 'https://api.openai.com/v1').trim();
  if (!trimmed) return 'https://api.openai.com/v1';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Merge discovered commands with the hardcoded fallback list.
 * Discovered commands (primary) take precedence for the set of names,
 * but we enrich them with descriptions from the fallback/description map.
 */
function mergeCommands(
  primary: Array<{ name: string; description: string; argumentHint: string }>,
  fallback: Array<{ name: string; description: string; argumentHint: string }>
) {
  const merged = new Map<string, { name: string; description: string; argumentHint: string }>();
  for (const cmd of primary) {
    // Enrich discovered commands (which may lack descriptions) with known descriptions
    if (!cmd.description) {
      const known = COMMAND_DESC_MAP.get(cmd.name);
      if (known) {
        merged.set(cmd.name, { name: cmd.name, description: known.description, argumentHint: known.argumentHint });
        continue;
      }
    }
    merged.set(cmd.name, cmd);
  }
  for (const cmd of fallback) {
    if (!merged.has(cmd.name)) merged.set(cmd.name, cmd);
  }
  return Array.from(merged.values());
}

// Get available slash commands for a provider
agent.get('/commands/:provider', async (c) => {
  const provider = c.req.param('provider');
  if (provider === 'codex') {
    return c.json(CODEX_COMMANDS);
  }
  // Claude: use cached from live session, or defaults
  const cached = getCachedClaudeCommands();
  if (cached && cached.length > 0) {
    return c.json(mergeCommands(cached, DEFAULT_CLAUDE_COMMANDS));
  }

  const discovered = await discoverClaudeCommands();
  if (discovered && discovered.length > 0) {
    return c.json(mergeCommands(discovered, DEFAULT_CLAUDE_COMMANDS));
  }

  return c.json(DEFAULT_CLAUDE_COMMANDS);
});

// Get available models for a provider (dynamic for Codex/OpenAI)
agent.post('/models/:provider', async (c) => {
  const provider = c.req.param('provider');
  if (provider !== 'codex') {
    return c.json([]);
  }

  // First choice: Codex local model cache (works for ChatGPT-account auth too).
  const cachedModels = await loadCodexCachedModels();
  if (cachedModels.length > 0) {
    return c.json(cachedModels);
  }

  let body: { modelConfig?: { apiKey?: string; baseUrl?: string } } = {};
  try {
    body = await c.req.json<{ modelConfig?: { apiKey?: string; baseUrl?: string } }>();
  } catch {
    body = {};
  }
  const apiKey = body.modelConfig?.apiKey || process.env.OPENAI_API_KEY;
  const baseUrl = normalizeBaseUrl(body.modelConfig?.baseUrl || process.env.OPENAI_BASE_URL);

  if (!apiKey) {
    return c.json(DEFAULT_CODEX_MODELS);
  }

  try {
    const resp = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!resp.ok) {
      return c.json(DEFAULT_CODEX_MODELS);
    }

    const data = await resp.json() as { data?: Array<{ id?: string; owned_by?: string }> };
    const models = (data.data || [])
      .map((m) => m.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .filter((id) => /^(gpt|o\d|codex)/i.test(id))
      .sort((a, b) => a.localeCompare(b))
      .map((id) => ({ id, name: id, provider: 'OpenAI' }));

    return c.json(models.length > 0 ? models : DEFAULT_CODEX_MODELS);
  } catch {
    return c.json(DEFAULT_CODEX_MODELS);
  }
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
  const trimmedPrompt = body.prompt.trim();
  const isSlashCommand = /^\/\S+/.test(trimmedPrompt);
  // Resolve project path for working directory
  let cwd: string | undefined;
  if (body.projectId) {
    try {
      const projects = await loadProjects();
      const project = projects.find((p) => p.id === body.projectId);
      if (project) cwd = project.path;
    } catch {
      // Fall through to default cwd
    }
  }

  const config = {
    provider,
    apiKey: body.modelConfig?.apiKey,
    baseUrl: body.modelConfig?.baseUrl,
    model: body.modelConfig?.model,
    reasoningEffort: body.modelConfig?.reasoningEffort,
    cwd,
  } as const;

  let generator: AsyncGenerator<AgentMessage>;
  if (provider === 'codex') {
    generator = runCodex(body.prompt, config);
  } else {
    generator = runClaude(body.prompt, config, body.conversation, body.permissionMode, isSlashCommand);
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
