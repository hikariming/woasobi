/**
 * Project & session discovery from Claude Code and Codex CLI data
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { nanoid } from 'nanoid';
import type { StoredProject } from './index.js';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const CODEX_CONFIG_PATH = join(homedir(), '.codex', 'config.toml');
const CODEX_SESSIONS_DIR = join(homedir(), '.codex', 'sessions');

const MAX_SESSIONS_PER_PROJECT = 10;

// --- Path decoding ---

function decodeClaudePath(encoded: string): string | null {
  const parts = encoded.slice(1).split('-');
  if (parts.length === 0) return null;
  return resolveSegments('/', parts);
}

function resolveSegments(base: string, parts: string[]): string | null {
  if (parts.length === 0) return existsSync(base) ? base : null;

  for (let len = 1; len <= parts.length; len++) {
    const segment = parts.slice(0, len).join('-');
    const candidate = join(base, segment);

    if (existsSync(candidate)) {
      const result = resolveSegments(candidate, parts.slice(len));
      if (result) return result;
    }
  }

  return null;
}

// --- Project discovery ---

export function discoverClaudeProjects(): Array<{ path: string; name: string }> {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) return [];

  const results: Array<{ path: string; name: string }> = [];
  try {
    const dirs = readdirSync(CLAUDE_PROJECTS_DIR);
    for (const dir of dirs) {
      if (!dir.startsWith('-')) continue;

      const resolved = decodeClaudePath(dir);
      if (resolved && existsSync(resolved)) {
        results.push({ path: resolved, name: basename(resolved) });
      }
    }
  } catch {
    // Directory read failed
  }

  return results;
}

export function discoverCodexProjects(): Array<{ path: string; name: string }> {
  if (!existsSync(CODEX_CONFIG_PATH)) return [];

  const results: Array<{ path: string; name: string }> = [];
  try {
    const content = readFileSync(CODEX_CONFIG_PATH, 'utf-8');
    const regex = /\[projects\."([^"]+)"\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const path = match[1];
      if (existsSync(path)) {
        results.push({ path, name: basename(path) });
      }
    }
  } catch {
    // File read/parse failed
  }

  return results;
}

/**
 * Merge discovered projects with existing ones, dedup by path.
 * If same path exists from a different source, update to 'claude+codex'.
 */
export function mergeDiscoveredProjects(
  existing: StoredProject[],
  discovered: Array<{ path: string; name: string; source: 'claude' | 'codex' }>
): StoredProject[] {
  const result = [...existing];
  const pathIndex = new Map(result.map((p, i) => [p.path, i]));
  const now = new Date().toISOString();

  for (const d of discovered) {
    const idx = pathIndex.get(d.path);
    if (idx !== undefined) {
      // Path already exists - update source if from a different tool
      const p = result[idx];
      if (p.source !== d.source && p.source !== 'claude+codex' && p.source !== 'manual') {
        result[idx] = { ...p, source: 'claude+codex' };
      }
    } else {
      const newProject: StoredProject = {
        id: nanoid(8),
        name: d.name,
        path: d.path,
        source: d.source,
        addedAt: now,
      };
      result.push(newProject);
      pathIndex.set(d.path, result.length - 1);
    }
  }

  return result;
}

// --- Session discovery ---

export interface DiscoveredSession {
  title: string;
  projectPath: string;
  sourcePath: string;
  mode: 'claudeCode' | 'codex';
  model: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Read first N bytes of a file (avoids reading entire large session files).
 */
function readFileHead(filePath: string, bytes = 8192): string {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.slice(0, bytes);
  } catch {
    return '';
  }
}

/**
 * Parse complete lines from a text chunk (drops incomplete last line).
 */
function completeLines(chunk: string): string[] {
  const lines = chunk.split('\n');
  if (!chunk.endsWith('\n')) lines.pop();
  return lines.filter(Boolean);
}

/**
 * Discover Claude Code sessions from ~/.claude/projects/
 */
export function discoverClaudeSessions(): DiscoveredSession[] {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) return [];

  const sessions: DiscoveredSession[] = [];

  try {
    const dirs = readdirSync(CLAUDE_PROJECTS_DIR);
    for (const dir of dirs) {
      if (!dir.startsWith('-')) continue;

      const projectDirPath = join(CLAUDE_PROJECTS_DIR, dir);
      const projectPath = decodeClaudePath(dir);
      if (!projectPath) continue;

      // Prefer sessions-index.json (rich metadata, fast)
      const indexPath = join(projectDirPath, 'sessions-index.json');

      if (existsSync(indexPath)) {
        try {
          const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
          const entries: any[] = data.entries || [];
          entries.sort((a: any, b: any) =>
            new Date(b.modified || 0).getTime() - new Date(a.modified || 0).getTime()
          );

          for (const entry of entries.slice(0, MAX_SESSIONS_PER_PROJECT)) {
            if (!entry.fullPath || !existsSync(entry.fullPath)) continue;
            if (entry.isSidechain) continue;

            let title = entry.summary || entry.firstPrompt || 'Untitled';
            if (title.length > 80) title = title.slice(0, 77) + '...';

            sessions.push({
              title,
              projectPath,
              sourcePath: entry.fullPath,
              mode: 'claudeCode',
              model: '',
              messageCount: entry.messageCount || 0,
              createdAt: entry.created || new Date().toISOString(),
              updatedAt: entry.modified || new Date().toISOString(),
            });
          }
        } catch { /* index parse failed */ }
      } else {
        // Fallback: scan JSONL files directly
        try {
          const files = readdirSync(projectDirPath).filter(f => f.endsWith('.jsonl'));
          const withStats = files.map(f => {
            const fp = join(projectDirPath, f);
            try {
              const stat = statSync(fp);
              return { path: fp, mtime: stat.mtimeMs, ctime: stat.birthtimeMs };
            } catch { return null; }
          }).filter(Boolean) as Array<{ path: string; mtime: number; ctime: number }>;

          withStats.sort((a, b) => b.mtime - a.mtime);

          for (const { path: fp, mtime, ctime } of withStats.slice(0, MAX_SESSIONS_PER_PROJECT)) {
            const chunk = readFileHead(fp);
            const lines = completeLines(chunk);

            let title = 'Untitled';
            for (const line of lines) {
              try {
                const obj = JSON.parse(line);
                if (obj.type === 'user' && typeof obj.message?.content === 'string') {
                  const text = obj.message.content;
                  title = text.length > 80 ? text.slice(0, 77) + '...' : text;
                  break;
                }
              } catch { continue; }
            }

            sessions.push({
              title,
              projectPath,
              sourcePath: fp,
              mode: 'claudeCode',
              model: '',
              messageCount: 0,
              createdAt: new Date(ctime).toISOString(),
              updatedAt: new Date(mtime).toISOString(),
            });
          }
        } catch { /* dir read failed */ }
      }
    }
  } catch { /* top-level fail */ }

  return sessions;
}

/**
 * Discover Codex CLI sessions from ~/.codex/sessions/
 */
export function discoverCodexSessions(): DiscoveredSession[] {
  if (!existsSync(CODEX_SESSIONS_DIR)) return [];

  const sessions: DiscoveredSession[] = [];

  function scanDir(dir: string) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.jsonl')) {
          try {
            // Codex sessions: system context can be 30KB+ before first user message
            // Read full file and parse line-by-line with early exit
            const content = readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            if (lines.length === 0) continue;

            const meta = JSON.parse(lines[0]);
            if (meta.type !== 'session_meta') continue;

            const cwd = meta.payload?.cwd || '';
            if (!cwd) continue;

            // Find first real user message for title (event_msg with user_message)
            let title = 'Untitled';
            for (const line of lines.slice(1)) {
              try {
                const obj = JSON.parse(line);
                if (obj.type === 'event_msg' && obj.payload?.type === 'user_message') {
                  // User text is in payload.message (string)
                  const text = obj.payload.message
                    || (obj.payload.content || [])
                        .filter((c: any) => c.type === 'input_text')
                        .map((c: any) => c.text)
                        .join(' ');
                  if (text) {
                    title = text.length > 80 ? text.slice(0, 77) + '...' : text;
                    break;
                  }
                }
              } catch { continue; }
            }

            const stat = statSync(fullPath);

            sessions.push({
              title,
              projectPath: cwd,
              sourcePath: fullPath,
              mode: 'codex',
              model: meta.payload?.model || '',
              messageCount: 0,
              createdAt: new Date(stat.birthtimeMs).toISOString(),
              updatedAt: new Date(stat.mtimeMs).toISOString(),
            });
          } catch { /* skip malformed */ }
        }
      }
    } catch { /* dir not readable */ }
  }

  scanDir(CODEX_SESSIONS_DIR);

  // Sort by recency, limit per project
  sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const perProject = new Map<string, number>();
  return sessions.filter(s => {
    const count = perProject.get(s.projectPath) || 0;
    if (count >= MAX_SESSIONS_PER_PROJECT) return false;
    perProject.set(s.projectPath, count + 1);
    return true;
  });
}

/**
 * Run full discovery: Claude + Codex, merge with existing
 */
export function discoverAndMerge(existing: StoredProject[]): StoredProject[] {
  const claudeProjects = discoverClaudeProjects().map((p) => ({ ...p, source: 'claude' as const }));
  const codexProjects = discoverCodexProjects().map((p) => ({ ...p, source: 'codex' as const }));

  return mergeDiscoveredProjects(existing, [...claudeProjects, ...codexProjects]);
}
