import { Hono } from 'hono';
import { spawn, type ChildProcess } from 'node:child_process';
import { nanoid } from 'nanoid';
import { loadProjects } from '../storage/index.js';
import { platform } from 'node:os';

const terminal = new Hono();

interface ShellSession {
  id: string;
  projectId: string;
  cwd: string;
  process: ChildProcess;
  outputBuffer: string[];
  running: boolean;
}

const sessions = new Map<string, ShellSession>();

// POST /create - Spawn a new shell session at a project path
terminal.post('/create', async (c) => {
  const { projectId } = await c.req.json<{ projectId: string }>();
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === projectId);
  if (!project) return c.json({ error: 'project not found' }, 404);

  const id = `sh-${nanoid(6)}`;
  const shell = platform() === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/zsh';

  const proc = spawn(shell, [], {
    cwd: project.path,
    env: { ...process.env, TERM: 'dumb', PS1: '$ ' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const session: ShellSession = {
    id,
    projectId,
    cwd: project.path,
    process: proc,
    outputBuffer: [],
    running: true,
  };

  proc.stdout?.on('data', (data: Buffer) => {
    const text = data.toString();
    session.outputBuffer.push(...text.split('\n'));
    // Cap buffer at 5000 lines
    if (session.outputBuffer.length > 5000) {
      session.outputBuffer = session.outputBuffer.slice(-3000);
    }
  });

  proc.stderr?.on('data', (data: Buffer) => {
    const text = data.toString();
    session.outputBuffer.push(...text.split('\n').map(l => `__ERR__${l}`));
  });

  proc.on('close', () => {
    session.running = false;
  });

  sessions.set(id, session);

  return c.json({ id, cwd: project.path });
});

// POST /:id/exec - Execute a command in a shell session
terminal.post('/:id/exec', async (c) => {
  const id = c.req.param('id');
  const session = sessions.get(id);
  if (!session) return c.json({ error: 'session not found' }, 404);
  if (!session.running) return c.json({ error: 'session has ended' }, 400);

  const { command } = await c.req.json<{ command: string }>();
  if (!command) return c.json({ error: 'command is required' }, 400);

  // Clear buffer to capture only this command's output
  const startIdx = session.outputBuffer.length;

  // Write command to stdin
  session.process.stdin?.write(command + '\n');

  // Wait for output to stabilize
  await new Promise<void>((resolve) => {
    let stableCount = 0;
    let lastLen = session.outputBuffer.length;

    const check = setInterval(() => {
      if (session.outputBuffer.length === lastLen) {
        stableCount++;
        if (stableCount >= 3) {
          clearInterval(check);
          resolve();
        }
      } else {
        stableCount = 0;
        lastLen = session.outputBuffer.length;
      }
    }, 100);

    // Timeout after 30s
    setTimeout(() => {
      clearInterval(check);
      resolve();
    }, 30000);
  });

  // Get new output since command was sent
  const newOutput = session.outputBuffer.slice(startIdx);
  const lines = newOutput.map((line) => {
    if (line.startsWith('__ERR__')) {
      return { type: 'err' as const, text: line.slice(7) };
    }
    return { type: 'out' as const, text: line };
  });

  return c.json({ lines });
});

// POST /:id/kill - Kill a shell session
terminal.post('/:id/kill', async (c) => {
  const id = c.req.param('id');
  const session = sessions.get(id);
  if (!session) return c.json({ error: 'session not found' }, 404);

  session.process.kill();
  sessions.delete(id);

  return c.json({ ok: true });
});

// GET /sessions - List active sessions
terminal.get('/sessions', (c) => {
  const list = Array.from(sessions.values()).map((s) => ({
    id: s.id,
    projectId: s.projectId,
    cwd: s.cwd,
    running: s.running,
  }));
  return c.json(list);
});

export default terminal;
