import { Hono } from 'hono';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { WebSocketServer, type WebSocket } from 'ws';
import { loadProjects } from '../storage/index.js';

// node-pty is a CJS native module — use createRequire for ESM compat
const require = createRequire(import.meta.url);
const pty = require('node-pty') as typeof import('node-pty');

const terminal = new Hono();

// Keep a minimal REST endpoint for listing active sessions (debugging)
const activeSessions = new Map<string, { projectId: string; cwd: string }>();

terminal.get('/sessions', (c) => {
  const list = Array.from(activeSessions.entries()).map(([id, s]) => ({
    id,
    projectId: s.projectId,
    cwd: s.cwd,
  }));
  return c.json(list);
});

/**
 * Setup WebSocket server for terminal connections.
 * Attach to the existing HTTP server at path /terminal/ws
 *
 * Protocol:
 *   Client → Server (JSON):
 *     { type: "input", data: string }    — terminal input (keystrokes)
 *     { type: "resize", cols: number, rows: number } — resize PTY
 *
 *   Server → Client (JSON):
 *     { type: "output", data: string }   — terminal output
 *     { type: "exit", code: number }     — shell process exited
 */
type UpgradeableServer = {
  on(event: 'upgrade', cb: (req: IncomingMessage, socket: Duplex, head: Buffer) => void): unknown;
};

export function setupTerminalWebSocket(server: UpgradeableServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url || '/', `http://localhost`);
    if (url.pathname === '/terminal/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      // Not our WebSocket path — let other handlers deal with it or destroy
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, request) => {
    const url = new URL(request.url || '/', `http://localhost`);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      ws.send(JSON.stringify({ type: 'output', data: '\r\nError: projectId is required\r\n' }));
      ws.close();
      return;
    }

    // Look up project to get working directory
    let cwd: string;
    try {
      const projects = await loadProjects();
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        ws.send(JSON.stringify({ type: 'output', data: '\r\nError: project not found\r\n' }));
        ws.close();
        return;
      }
      cwd = project.path;
    } catch {
      ws.send(JSON.stringify({ type: 'output', data: '\r\nError: failed to load project\r\n' }));
      ws.close();
      return;
    }

    // Validate CWD exists before spawning
    if (!existsSync(cwd)) {
      ws.send(JSON.stringify({ type: 'output', data: `\r\nError: project path does not exist: ${cwd}\r\n` }));
      ws.close();
      return;
    }

    // Spawn PTY
    const shell = process.env.SHELL || '/bin/zsh';
    const cols = parseInt(url.searchParams.get('cols') || '120');
    const rows = parseInt(url.searchParams.get('rows') || '30');

    let ptyProcess: ReturnType<typeof pty.spawn>;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Terminal] Failed to spawn PTY at ${cwd}: ${msg}`);
      ws.send(JSON.stringify({ type: 'output', data: `\r\nError: failed to spawn shell: ${msg}\r\n` }));
      ws.close();
      return;
    }

    const sessionId = `pty-${ptyProcess.pid}`;
    activeSessions.set(sessionId, { projectId, cwd });

    console.log(`[Terminal] Session ${sessionId} started at ${cwd} (${cols}x${rows})`);

    // PTY output → WebSocket
    const dataDisposable = ptyProcess.onData((data: string) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });

    // PTY exit → WebSocket
    const exitDisposable = ptyProcess.onExit(({ exitCode }) => {
      console.log(`[Terminal] Session ${sessionId} exited with code ${exitCode}`);
      activeSessions.delete(sessionId);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'exit', code: exitCode }));
        ws.close();
      }
    });

    // WebSocket messages → PTY
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'input' && typeof msg.data === 'string') {
          ptyProcess.write(msg.data);
        } else if (msg.type === 'resize' && typeof msg.cols === 'number' && typeof msg.rows === 'number') {
          ptyProcess.resize(msg.cols, msg.rows);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    // WebSocket close → kill PTY
    ws.on('close', () => {
      console.log(`[Terminal] WebSocket closed for session ${sessionId}`);
      dataDisposable.dispose();
      exitDisposable.dispose();
      activeSessions.delete(sessionId);
      try {
        ptyProcess.kill();
      } catch {
        // Already dead
      }
    });

    ws.on('error', () => {
      try { ptyProcess.kill(); } catch { /* ignore */ }
      activeSessions.delete(sessionId);
    });
  });
}

export default terminal;
