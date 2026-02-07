/**
 * File-based storage for WoaSobi data (~/.woasobi/)
 */

import { readFile, writeFile, mkdir, unlink, appendFile, readdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const DATA_DIR = join(homedir(), '.woasobi');
const THREADS_DIR = join(DATA_DIR, 'threads');
const PROJECTS_FILE = join(DATA_DIR, 'projects.json');

// --- Types (backend-only, mirrors frontend types) ---

export interface StoredProject {
  id: string;
  name: string;
  path: string;
  source: 'manual' | 'claude' | 'codex' | 'claude+codex';
  addedAt: string;
  pinned?: boolean;
}

export interface StoredThread {
  id: string;
  projectId: string;
  title: string;
  mode: 'claudeCode' | 'codex';
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  sourcePath?: string; // Path to original CLI session file (imported)
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
    output?: string;
  }>;
  timestamp: string;
  cost?: number;
  duration?: number;
  isError?: boolean;
}

// --- Initialization ---

export async function ensureDataDir(): Promise<void> {
  await mkdir(THREADS_DIR, { recursive: true });
  if (!existsSync(PROJECTS_FILE)) {
    await writeFile(PROJECTS_FILE, '[]', 'utf-8');
  }
}

// --- Projects ---

export async function loadProjects(): Promise<StoredProject[]> {
  try {
    const data = await readFile(PROJECTS_FILE, 'utf-8');
    return JSON.parse(data) as StoredProject[];
  } catch {
    return [];
  }
}

export async function saveProjects(projects: StoredProject[]): Promise<void> {
  const tmp = PROJECTS_FILE + '.tmp';
  await writeFile(tmp, JSON.stringify(projects, null, 2), 'utf-8');
  await rename(tmp, PROJECTS_FILE);
}

// --- Threads ---

function threadJsonPath(id: string): string {
  return join(THREADS_DIR, `${id}.json`);
}

function threadJsonlPath(id: string): string {
  return join(THREADS_DIR, `${id}.jsonl`);
}

export async function loadAllThreads(): Promise<StoredThread[]> {
  try {
    const files = await readdir(THREADS_DIR);
    const threads: StoredThread[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = await readFile(join(THREADS_DIR, file), 'utf-8');
          threads.push(JSON.parse(data) as StoredThread);
        } catch {
          // Skip corrupted files
        }
      }
    }
    return threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function loadThread(id: string): Promise<StoredThread | null> {
  try {
    const data = await readFile(threadJsonPath(id), 'utf-8');
    return JSON.parse(data) as StoredThread;
  } catch {
    return null;
  }
}

export async function saveThread(thread: StoredThread): Promise<void> {
  const tmp = threadJsonPath(thread.id) + '.tmp';
  await writeFile(tmp, JSON.stringify(thread, null, 2), 'utf-8');
  await rename(tmp, threadJsonPath(thread.id));
}

export async function deleteThread(id: string): Promise<void> {
  try { await unlink(threadJsonPath(id)); } catch { /* ignore */ }
  try { await unlink(threadJsonlPath(id)); } catch { /* ignore */ }
}

// --- Messages ---

export async function loadMessages(threadId: string): Promise<StoredMessage[]> {
  try {
    const data = await readFile(threadJsonlPath(threadId), 'utf-8');
    const lines = data.trim().split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as StoredMessage);
  } catch {
    return [];
  }
}

export async function appendMessage(threadId: string, msg: StoredMessage): Promise<void> {
  await appendFile(threadJsonlPath(threadId), JSON.stringify(msg) + '\n', 'utf-8');
}

export async function updateThreadAfterMessage(threadId: string): Promise<void> {
  const thread = await loadThread(threadId);
  if (!thread) return;

  // Count messages from JSONL
  try {
    const data = await readFile(threadJsonlPath(threadId), 'utf-8');
    const lines = data.trim().split('\n').filter(Boolean);
    thread.messageCount = lines.length;
  } catch {
    thread.messageCount = 0;
  }

  thread.updatedAt = new Date().toISOString();
  await saveThread(thread);
}
