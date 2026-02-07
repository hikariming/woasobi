/**
 * Codex CLI Agent - Lightweight integration via CLI spawning
 *
 * Spawns the `codex` CLI and captures stdout/stderr.
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join } from 'path';
import { nanoid } from 'nanoid';
import type { AgentConfig, AgentMessage } from './types.js';

/**
 * Find the codex CLI binary
 */
export function findCodex(): string | undefined {
  const os = platform();

  // Try which/where
  try {
    const cmd = os === 'win32' ? 'where codex' : 'which codex';
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' }).trim();
    const firstPath = result.split('\n')[0];
    if (firstPath && existsSync(firstPath)) {
      console.log(`[Codex] Found at: ${firstPath}`);
      return firstPath;
    }
  } catch {
    // Not found
  }

  // Check common paths
  const commonPaths = os === 'win32'
    ? [join(homedir(), 'AppData', 'Roaming', 'npm', 'codex.cmd')]
    : [
        '/usr/local/bin/codex',
        join(homedir(), '.local', 'bin', 'codex'),
        join(homedir(), '.npm-global', 'bin', 'codex'),
      ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      console.log(`[Codex] Found at: ${p}`);
      return p;
    }
  }

  // Check CODEX_PATH env
  if (process.env.CODEX_PATH && existsSync(process.env.CODEX_PATH)) {
    return process.env.CODEX_PATH;
  }

  return undefined;
}

// Active sessions for abort support
const sessions = new Map<string, { kill: () => void }>();

export function stopCodexSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.kill();
    sessions.delete(sessionId);
    return true;
  }
  return false;
}

/**
 * Run Codex CLI agent
 */
export async function* runCodex(
  prompt: string,
  config: AgentConfig
): AsyncGenerator<AgentMessage> {
  const sessionId = nanoid(10);
  yield { type: 'session', sessionId };

  // Find codex binary
  const codexPath = findCodex();
  if (!codexPath) {
    yield {
      type: 'error',
      message: 'Codex CLI not found. Install with: npm install -g @openai/codex',
    };
    yield { type: 'done' };
    return;
  }

  // Build environment
  const env: Record<string, string | undefined> = { ...process.env };
  if (config.apiKey) {
    env.OPENAI_API_KEY = config.apiKey;
  }
  if (config.baseUrl) {
    env.OPENAI_BASE_URL = config.baseUrl;
  }
  if (config.model) {
    env.CODEX_MODEL = config.model;
  }

  // Spawn codex process
  const proc = spawn(codexPath, ['--quiet', prompt], {
    cwd: process.cwd(),
    env: env as Record<string, string>,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  sessions.set(sessionId, { kill: () => proc.kill('SIGTERM') });

  // Collect output
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  proc.stdout?.setEncoding('utf-8');
  proc.stderr?.setEncoding('utf-8');

  proc.stdout?.on('data', (data: string) => {
    stdoutChunks.push(data);
  });

  proc.stderr?.on('data', (data: string) => {
    stderrChunks.push(data);
  });

  // Wait for process to complete
  const exitCode = await new Promise<number>((resolve) => {
    proc.on('close', (code) => resolve(code || 0));
    proc.on('error', () => resolve(1));
  });

  const stdout = stdoutChunks.join('');
  const stderr = stderrChunks.join('');

  if (stdout) {
    yield { type: 'text', content: stdout };
  }

  if (exitCode !== 0) {
    const errorMsg = stderr || `Codex exited with code ${exitCode}`;
    const isApiKeyError =
      /Invalid API key|invalid_api_key|authentication|Unauthorized|401/i.test(errorMsg);

    if (isApiKeyError) {
      yield { type: 'error', message: '__API_KEY_ERROR__' };
    } else {
      yield { type: 'error', message: errorMsg };
    }
  }

  sessions.delete(sessionId);
  yield { type: 'done' };
}
