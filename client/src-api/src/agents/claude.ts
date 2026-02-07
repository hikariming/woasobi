/**
 * Claude Code Agent - Lightweight integration via @anthropic-ai/claude-agent-sdk
 *
 * Simplified from workany's implementation:
 * - No planning phase, sandbox, MCP, or skills
 * - Direct execution with query()
 * - Claude binary auto-discovery
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { nanoid } from 'nanoid';
import type { AgentConfig, AgentMessage, ConversationMessage } from './types.js';

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

export function getCachedClaudeCommands(): SlashCommandInfo[] | null {
  return cachedClaudeCommands;
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
  permissionMode?: string
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

  // Build prompt with conversation context
  const conversationContext = formatConversation(conversation);
  const fullPrompt = conversationContext + prompt;

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

      // Process system messages (init, status)
      if (msg.type === 'system') {
        const sysMsg = msg as Record<string, unknown>;
        if (sysMsg.subtype === 'init') {
          const commands = sysMsg.slash_commands as string[] | undefined;
          if (commands) {
            cachedClaudeCommands = commands.map(name => ({
              name,
              description: '',
              argumentHint: '',
            }));
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
        }
      }

      // Process result
      if (msg.type === 'result') {
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
