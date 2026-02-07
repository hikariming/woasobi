import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { loadProjects, saveProjects, loadAllThreads, saveThread, type StoredThread } from '../storage/index.js';
import { discoverAndMerge, discoverClaudeSessions, discoverCodexSessions } from '../storage/discover.js';

const projects = new Hono();

// List all projects
projects.get('/', async (c) => {
  const list = await loadProjects();
  return c.json(list);
});

// Add a project manually
projects.post('/', async (c) => {
  const body = await c.req.json<{ path: string }>();
  if (!body.path) {
    return c.json({ error: 'path is required' }, 400);
  }

  if (!existsSync(body.path)) {
    return c.json({ error: 'path does not exist' }, 400);
  }

  const existing = await loadProjects();
  if (existing.some((p) => p.path === body.path)) {
    return c.json({ error: 'project already exists' }, 409);
  }

  const project = {
    id: nanoid(8),
    name: basename(body.path),
    path: body.path,
    source: 'manual' as const,
    addedAt: new Date().toISOString(),
  };

  existing.push(project);
  await saveProjects(existing);
  return c.json(project, 201);
});

// Delete a project
projects.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await loadProjects();
  const filtered = existing.filter((p) => p.id !== id);

  if (filtered.length === existing.length) {
    return c.json({ error: 'project not found' }, 404);
  }

  await saveProjects(filtered);
  return c.json({ ok: true });
});

// Discover projects from Claude Code + Codex, and import CLI sessions as threads
projects.post('/discover', async (c) => {
  // 1. Discover and merge projects
  const existing = await loadProjects();
  const merged = discoverAndMerge(existing);
  await saveProjects(merged);

  // 2. Discover CLI sessions
  const claudeSessions = discoverClaudeSessions();
  const codexSessions = discoverCodexSessions();
  const allSessions = [...claudeSessions, ...codexSessions];

  // 3. Import new sessions as threads (dedup by sourcePath)
  const existingThreads = await loadAllThreads();
  const existingSourcePaths = new Set(
    existingThreads.filter(t => t.sourcePath).map(t => t.sourcePath!)
  );
  const projectByPath = new Map(merged.map(p => [p.path, p]));

  let importedCount = 0;
  for (const session of allSessions) {
    if (existingSourcePaths.has(session.sourcePath)) continue;

    const project = projectByPath.get(session.projectPath);
    if (!project) continue;

    const thread: StoredThread = {
      id: nanoid(8),
      projectId: project.id,
      title: session.title,
      mode: session.mode,
      model: session.model,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.messageCount,
      sourcePath: session.sourcePath,
    };

    await saveThread(thread);
    importedCount++;
  }

  return c.json(merged);
});

export default projects;
