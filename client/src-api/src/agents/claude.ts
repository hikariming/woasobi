/**
 * Claude Code Agent - Lightweight integration via @anthropic-ai/claude-agent-sdk
 *
 * Simplified from workany's implementation:
 * - No planning phase, sandbox, MCP, or skills
 * - Direct execution with query()
 * - Claude binary auto-discovery
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { nanoid } from 'nanoid';
import type { AgentConfig, AgentMessage, ConversationMessage } from './types.js';

const DATA_DIR = join(homedir(), '.woasobi');
const COMMANDS_CACHE_FILE = join(DATA_DIR, 'claude-commands.json');
const COMMANDS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Build extended PATH that includes common package manager bin locations
 */
function getExtendedPath(): string {
  const home = homedir();
  const isWindows = platform() === 'win32';
  const sep = isWindows ? ';' : ':';

  const paths = [process.env.PATH || ''];

  if (isWindows) {
    paths.push(
      join(home, 'AppData', 'Roaming', 'npm'),
      join(home, '.volta', 'bin')
    );
  } else {
    paths.push(
      '/usr/local/bin',
      '/opt/homebrew/bin',
      `${home}/.local/bin`,
      `${home}/.npm-global/bin`,
      `${home}/.volta/bin`
    );

    // Add nvm paths
    const nvmDir = join(home, '.nvm', 'versions', 'node');
    try {
      if (existsSync(nvmDir)) {
        for (const version of readdirSync(nvmDir)) {
          paths.push(join(nvmDir, version, 'bin'));
        }
      }
    } catch {
      // nvm not installed
    }
  }

  return paths.join(sep);
}

/**
 * Find the claude CLI binary
 */
export function findClaudeCode(): string | undefined {
  const os = platform();
  const extendedEnv = { ...process.env, PATH: getExtendedPath() };

  // Try which/where with extended PATH
  try {
    const cmd = os === 'win32' ? 'where claude' : 'which claude';
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: 'pipe',
      env: extendedEnv,
    }).trim();
    const firstPath = result.split('\n')[0];
    if (firstPath && existsSync(firstPath)) {
      console.log(`[Claude] Found at: ${firstPath}`);
      return firstPath;
    }
  } catch {
    // Not found via which
  }

  // Try login shell
  if (os !== 'win32') {
    for (const shell of ['bash', 'zsh']) {
      try {
        const result = execSync(`${shell} -l -c "which claude"`, {
          encoding: 'utf-8',
          stdio: 'pipe',
        }).trim();
        if (result && existsSync(result)) {
          console.log(`[Claude] Found via ${shell}: ${result}`);
          return result;
        }
      } catch {
        // Try next shell
      }
    }
  }

  // Check common paths
  const home = homedir();
  const commonPaths = os === 'win32'
    ? [join(home, 'AppData', 'Roaming', 'npm', 'claude.cmd')]
    : [
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
        join(home, '.local', 'bin', 'claude'),
        join(home, '.npm-global', 'bin', 'claude'),
        join(home, '.volta', 'bin', 'claude'),
      ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      console.log(`[Claude] Found at: ${p}`);
      return p;
    }
  }

  // Check CLAUDE_CODE_PATH env
  if (process.env.CLAUDE_CODE_PATH && existsSync(process.env.CLAUDE_CODE_PATH)) {
    return process.env.CLAUDE_CODE_PATH;
  }

  return undefined;
}

/**
 * Format conversation history into prompt context
 */
function formatConversation(conversation?: ConversationMessage[]): string {
  if (!conversation || conversation.length === 0) return '';

  // Keep last ~2000 tokens worth of history
  const maxChars = 8000;
  let totalChars = 0;
  const selected: string[] = [];

  for (let i = conversation.length - 1; i >= 0; i--) {
    const msg = conversation[i];
    const formatted = `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    if (totalChars + formatted.length > maxChars && selected.length >= 3) break;
    selected.unshift(formatted);
    totalChars += formatted.length;
  }

  return `## Previous Conversation\n${selected.join('\n\n')}\n\n---\n## Current Request\n`;
}

function getStatusText(sysMsg: Record<string, unknown>): string {
  const candidates = [sysMsg.status, sysMsg.message, sysMsg.text, sysMsg.detail, sysMsg.subtype];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function isAwaitingPermission(sysMsg: Record<string, unknown>): boolean {
  if (sysMsg.awaitingPermission === true || sysMsg.requiresPermission === true) return true;
  const text = getStatusText(sysMsg).toLowerCase();
  if (!text) return false;
  const permissionMentioned = /permission|approval|confirm/.test(text);
  const pendingMentioned = /await|wait|required|request|pending/.test(text);
  return permissionMentioned && pendingMentioned;
}

// Active sessions for abort support
const sessions = new Map<string, AbortController>();

// Cached slash commands from last init message
export interface SlashCommandInfo {
  name: string;
  description: string;
  argumentHint: string;
}
let cachedClaudeCommands: SlashCommandInfo[] | null = null;
let discoveringClaudeCommands: Promise<SlashCommandInfo[] | null> | null = null;

export function getCachedClaudeCommands(): SlashCommandInfo[] | null {
  return cachedClaudeCommands;
}

function normalizeSlashCommands(commands: string[]): SlashCommandInfo[] {
  const seen = new Set<string>();
  const normalized: SlashCommandInfo[] = [];
  for (const raw of commands) {
    const name = String(raw || '').trim().replace(/^\//, '');
    if (!name || seen.has(name)) continue;
    seen.add(name);
    normalized.push({ name, description: '', argumentHint: '' });
  }
  return normalized;
}

/** Load commands from disk cache if fresh enough */
function loadCommandsFromDisk(): SlashCommandInfo[] | null {
  try {
    if (!existsSync(COMMANDS_CACHE_FILE)) return null;
    const raw = readFileSync(COMMANDS_CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw) as { timestamp: number; commands: SlashCommandInfo[] };
    if (Date.now() - data.timestamp > COMMANDS_CACHE_TTL_MS) return null;
    if (!Array.isArray(data.commands) || data.commands.length === 0) return null;
    return data.commands;
  } catch {
    return null;
  }
}

/** Persist commands to disk */
function saveCommandsToDisk(commands: SlashCommandInfo[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(
      COMMANDS_CACHE_FILE,
      JSON.stringify({ timestamp: Date.now(), commands }, null, 2),
      'utf-8',
    );
  } catch {
    // Best-effort
  }
}

// Load from disk at module init
cachedClaudeCommands = loadCommandsFromDisk();
if (cachedClaudeCommands) {
  console.log(`[Claude] Loaded ${cachedClaudeCommands.length} cached slash commands from disk`);
}

/**
 * Try to proactively discover Claude slash commands from the init system event.
 * Results are cached in memory and on disk (~/.woasobi/claude-commands.json).
 */
export async function discoverClaudeCommands(): Promise<SlashCommandInfo[] | null> {
  if (cachedClaudeCommands && cachedClaudeCommands.length > 0) {
    return cachedClaudeCommands;
  }
  if (discoveringClaudeCommands) return discoveringClaudeCommands;

  discoveringClaudeCommands = (async () => {
    const claudePath = findClaudeCode();
    if (!claudePath) return null;

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 15_000);

    // Build environment like runClaude() so binary discovery is consistent.
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    env.PATH = getExtendedPath();

    const options: Options = {
      tools: { type: 'preset', preset: 'claude_code' },
      settingSources: ['user', 'project'],
      permissionMode: 'default',
      allowDangerouslySkipPermissions: false,
      abortController,
      env,
      pathToClaudeCodeExecutable: claudePath,
      maxTurns: 1,
    };

    try {
      for await (const message of query({ prompt: '', options })) {
        const msg = message as Record<string, unknown>;
        if (msg.type === 'system' && msg.subtype === 'init') {
          const commands = Array.isArray(msg.slash_commands)
            ? (msg.slash_commands as unknown[]).map((v) => String(v))
            : [];
          if (commands.length > 0) {
            cachedClaudeCommands = normalizeSlashCommands(commands);
            saveCommandsToDisk(cachedClaudeCommands);
            console.log(`[Claude] Discovered ${cachedClaudeCommands.length} slash commands`);
            return cachedClaudeCommands;
          }
          break;
        }
      }
    } catch {
      // Best-effort discovery only; caller handles fallback.
    } finally {
      clearTimeout(timeout);
      abortController.abort(); // ensure session is cleaned up
    }

    return null;
  })();

  try {
    return await discoveringClaudeCommands;
  } finally {
    discoveringClaudeCommands = null;
  }
}

export function stopClaudeSession(sessionId: string): boolean {
  const controller = sessions.get(sessionId);
  if (controller) {
    controller.abort();
    sessions.delete(sessionId);
    return true;
  }
  return false;
}

/**
 * Run Claude Code agent
 */
export async function* runClaude(
  prompt: string,
  config: AgentConfig,
  conversation?: ConversationMessage[],
  permissionMode?: string,
  isSlashCommand?: boolean
): AsyncGenerator<AgentMessage> {
  const sessionId = nanoid(10);
  const abortController = new AbortController();
  sessions.set(sessionId, abortController);

  yield { type: 'session', sessionId };

  // Find claude binary
  const claudePath = findClaudeCode();
  if (!claudePath) {
    yield { type: 'error', message: '__CLAUDE_CODE_NOT_FOUND__' };
    yield { type: 'done' };
    return;
  }

  // Build environment
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  env.PATH = getExtendedPath();

  if (config.apiKey) {
    env.ANTHROPIC_AUTH_TOKEN = config.apiKey;
    delete env.ANTHROPIC_API_KEY;
    if (config.baseUrl) {
      env.ANTHROPIC_BASE_URL = config.baseUrl;
    } else {
      delete env.ANTHROPIC_BASE_URL;
    }
  }

  if (config.model) {
    env.ANTHROPIC_MODEL = config.model;
  }

  // Slash commands must be passed through raw; prepended context can break command parsing.
  const fullPrompt = isSlashCommand ? prompt : (formatConversation(conversation) + prompt);

  // Dedup tracking
  const sentTextHashes = new Set<string>();
  const sentToolIds = new Set<string>();

  const effectivePermMode = (permissionMode || 'bypassPermissions') as 'bypassPermissions' | 'default' | 'acceptEdits' | 'plan' | 'dontAsk';

  const queryOptions: Options = {
    tools: { type: 'preset', preset: 'claude_code' },
    allowedTools: [
      'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash',
      'WebSearch', 'WebFetch', 'Task', 'TodoWrite',
    ],
    settingSources: ['user', 'project'],
    permissionMode: effectivePermMode,
    allowDangerouslySkipPermissions: effectivePermMode === 'bypassPermissions',
    abortController,
    env,
    model: config.model,
    pathToClaudeCodeExecutable: claudePath,
    maxTurns: 200,
  };

  try {
    for await (const message of query({ prompt: fullPrompt, options: queryOptions })) {
      if (abortController.signal.aborted) break;

      const msg = message as {
        type: string;
        message?: { content?: unknown[] };
        subtype?: string;
        total_cost_usd?: number;
        duration_ms?: number;
      };

      // Process assistant messages
      if (msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content as Record<string, unknown>[]) {
          if ('text' in block) {
            const text = block.text as string;
            const hash = text.slice(0, 100);
            if (!sentTextHashes.has(hash)) {
              sentTextHashes.add(hash);
              yield { type: 'text', content: text };
            }
          } else if ('name' in block && 'id' in block) {
            const toolId = block.id as string;
            if (!sentToolIds.has(toolId)) {
              sentToolIds.add(toolId);
              yield {
                type: 'tool_use',
                id: toolId,
                name: block.name as string,
                input: block.input,
              };
            }
          }
        }
      }

      // Process tool results
      if (msg.type === 'user' && msg.message?.content) {
        for (const block of msg.message.content as Record<string, unknown>[]) {
          if ('type' in block && block.type === 'tool_result') {
            const toolUseId = (block as Record<string, unknown>).tool_use_id ??
              (block as Record<string, unknown>).toolUseId;
            yield {
              type: 'tool_result',
              toolUseId: String(toolUseId ?? ''),
              output: typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content),
              isError: !!(block as Record<string, unknown>).is_error,
            };
          }
        }
      }

      // Process system messages (init, status, and others like slash command results)
      if (msg.type === 'system') {
        const sysMsg = msg as Record<string, unknown>;
        if (sysMsg.subtype === 'init') {
          const commands = sysMsg.slash_commands as string[] | undefined;
          if (commands) {
            cachedClaudeCommands = normalizeSlashCommands(commands);
          }
          yield {
            type: 'init',
            permissionMode: sysMsg.permissionMode as string | undefined,
            slashCommands: commands,
          };
        } else if (sysMsg.subtype === 'status' && sysMsg.permissionMode) {
          yield {
            type: 'status',
            permissionMode: sysMsg.permissionMode as string,
            statusText: getStatusText(sysMsg),
            awaitingPermission: isAwaitingPermission(sysMsg),
          };
        } else if (sysMsg.subtype === 'status') {
          yield {
            type: 'status',
            statusText: getStatusText(sysMsg),
            awaitingPermission: isAwaitingPermission(sysMsg),
          };
        } else {
          // Other system subtypes (e.g., slash command results)
          const text = getStatusText(sysMsg);
          if (text) {
            yield { type: 'text', content: text };
          }
        }
      }

      // Process result
      if (msg.type === 'result') {
        // The SDK may include a result text (e.g., for slash command responses)
        const resultObj = msg as Record<string, unknown>;
        if (typeof resultObj.result === 'string' && resultObj.result.trim()) {
          yield { type: 'text', content: resultObj.result };
        }
        yield {
          type: 'result',
          content: msg.subtype,
          cost: msg.total_cost_usd,
          duration: msg.duration_ms,
        };
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    const isApiKeyError =
      /Invalid API key|invalid_api_key|authentication|Unauthorized|401|403|Please run \/login/i.test(errorMsg);

    if (isApiKeyError) {
      yield { type: 'error', message: '__API_KEY_ERROR__' };
    } else {
      yield { type: 'error', message: errorMsg };
    }
  } finally {
    sessions.delete(sessionId);
    yield { type: 'done' };
  }
}
