import { API_BASE_URL } from '@/config/api';
import type { Project, Thread, Message, FileTreeNode, GitChange } from '@/types';

// --- Projects ---

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  return res.json();
}

export async function addProject(path: string): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to add project: ${res.status}`);
  }
  return res.json();
}

export async function removeProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to remove project: ${res.status}`);
}

export async function updateProject(id: string, updates: { pinned?: boolean }): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update project: ${res.status}`);
  return res.json();
}

export async function clearProjectThreads(id: string): Promise<{ deleted: number }> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}/threads`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to clear threads: ${res.status}`);
  return res.json();
}

export async function discoverProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects/discover`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to discover projects: ${res.status}`);
  return res.json();
}

// --- Threads ---

export async function fetchThreads(projectId?: string): Promise<Thread[]> {
  const url = projectId
    ? `${API_BASE_URL}/threads?projectId=${encodeURIComponent(projectId)}`
    : `${API_BASE_URL}/threads`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch threads: ${res.status}`);
  return res.json();
}

export async function createThread(data: {
  projectId: string;
  title?: string;
  mode: 'claudeCode' | 'codex';
  model: string;
}): Promise<Thread> {
  const res = await fetch(`${API_BASE_URL}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create thread: ${res.status}`);
  return res.json();
}

export async function updateThread(
  id: string,
  updates: { title?: string }
): Promise<Thread> {
  const res = await fetch(`${API_BASE_URL}/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update thread: ${res.status}`);
  return res.json();
}

export async function deleteThread(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/threads/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete thread: ${res.status}`);
}

export async function fetchMessages(threadId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE_URL}/threads/${threadId}/messages`);
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`);
  return res.json();
}

// --- Project Files ---

export async function fetchProjectFiles(projectId: string, depth = 5): Promise<FileTreeNode[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/files?depth=${depth}`);
  if (!res.ok) throw new Error(`Failed to fetch files: ${res.status}`);
  return res.json();
}

// --- Git Operations ---

export async function fetchGitStatus(projectId: string): Promise<GitChange[]> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/status`);
  if (!res.ok) throw new Error(`Failed to fetch git status: ${res.status}`);
  return res.json();
}

export async function stageFiles(projectId: string, files: string[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(`Failed to stage: ${res.status}`);
}

export async function unstageFiles(projectId: string, files: string[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/unstage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(`Failed to unstage: ${res.status}`);
}

export async function revertFiles(projectId: string, files: string[]): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/revert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  if (!res.ok) throw new Error(`Failed to revert: ${res.status}`);
}

export async function stageAllFiles(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/stage-all`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to stage all: ${res.status}`);
}

export async function unstageAllFiles(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/unstage-all`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to unstage all: ${res.status}`);
}

export async function discardAllChanges(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/discard-all`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to discard all: ${res.status}`);
}

export async function commitChanges(projectId: string, message: string): Promise<{ ok: boolean; output: string }> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to commit: ${res.status}`);
  }
  return res.json();
}

export async function fetchBranches(projectId: string): Promise<{ current: string; branches: string[] }> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/branches`);
  if (!res.ok) throw new Error(`Failed to fetch branches: ${res.status}`);
  return res.json();
}

export async function checkoutBranch(projectId: string, branch: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ branch }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to checkout: ${res.status}`);
  }
}

// --- Git Sync ---

export async function fetchSyncStatus(projectId: string): Promise<{ ahead: number; behind: number }> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/sync-status`);
  if (!res.ok) throw new Error(`Failed to fetch sync status: ${res.status}`);
  return res.json();
}

export async function gitPush(projectId: string): Promise<{ ok: boolean; output: string }> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/push`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to push: ${res.status}`);
  }
  return res.json();
}

export async function gitPull(projectId: string): Promise<{ ok: boolean; output: string }> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/git/pull`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Failed to pull: ${res.status}`);
  }
  return res.json();
}

// --- Terminal ---
// Terminal now uses WebSocket (via XTerminal component) instead of REST endpoints.
