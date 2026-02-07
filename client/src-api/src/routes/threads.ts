import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import {
  loadAllThreads,
  loadThread,
  saveThread,
  deleteThread,
  loadMessages,
  type StoredThread,
} from '../storage/index.js';

const threads = new Hono();

// List threads (optionally filtered by projectId)
threads.get('/', async (c) => {
  const projectId = c.req.query('projectId');
  let list = await loadAllThreads();
  if (projectId) {
    list = list.filter((t) => t.projectId === projectId);
  }
  return c.json(list);
});

// Create a new thread
threads.post('/', async (c) => {
  const body = await c.req.json<{
    projectId: string;
    title?: string;
    mode: 'claudeCode' | 'codex';
    model: string;
  }>();

  if (!body.projectId || !body.mode || !body.model) {
    return c.json({ error: 'projectId, mode, and model are required' }, 400);
  }

  const now = new Date().toISOString();
  const thread: StoredThread = {
    id: nanoid(8),
    projectId: body.projectId,
    title: body.title || 'New Thread',
    mode: body.mode,
    model: body.model,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };

  await saveThread(thread);
  return c.json(thread, 201);
});

// Get thread metadata
threads.get('/:id', async (c) => {
  const thread = await loadThread(c.req.param('id'));
  if (!thread) return c.json({ error: 'thread not found' }, 404);
  return c.json(thread);
});

// Update thread (title, etc.)
threads.patch('/:id', async (c) => {
  const thread = await loadThread(c.req.param('id'));
  if (!thread) return c.json({ error: 'thread not found' }, 404);

  const body = await c.req.json<{ title?: string }>();
  if (body.title !== undefined) thread.title = body.title;
  thread.updatedAt = new Date().toISOString();

  await saveThread(thread);
  return c.json(thread);
});

// Delete thread and its messages
threads.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const thread = await loadThread(id);
  if (!thread) return c.json({ error: 'thread not found' }, 404);

  await deleteThread(id);
  return c.json({ ok: true });
});

// Get messages for a thread
threads.get('/:id/messages', async (c) => {
  const id = c.req.param('id');
  const thread = await loadThread(id);
  if (!thread) return c.json({ error: 'thread not found' }, 404);

  if (thread.sourcePath) {
    // Imported CLI session - parse from original file
    const { parseClaudeSession, parseCodexSession } = await import('../storage/sessions.js');
    const cliMessages = thread.mode === 'codex'
      ? parseCodexSession(thread.sourcePath)
      : parseClaudeSession(thread.sourcePath);
    // Also include any WoaSobi-local messages (if user sent new messages)
    const localMessages = await loadMessages(id);
    return c.json([...cliMessages, ...localMessages]);
  }

  const messages = await loadMessages(id);
  return c.json(messages);
});

export default threads;
