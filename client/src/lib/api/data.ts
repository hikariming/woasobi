import { API_BASE_URL } from '@/config/api';
import type { Project, Thread, Message } from '@/types';

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
