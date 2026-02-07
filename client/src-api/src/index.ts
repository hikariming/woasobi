import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import agentRoutes from './routes/agent.js';
import healthRoutes from './routes/health.js';
import projectRoutes from './routes/projects.js';
import threadRoutes from './routes/threads.js';
import { ensureDataDir } from './storage/index.js';

const app = new Hono();

// CORS - allow frontend dev server
app.use('*', cors({
  origin: ['http://localhost:1420', 'http://127.0.0.1:1420', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Routes
app.route('/agent', agentRoutes);
app.route('/health', healthRoutes);
app.route('/projects', projectRoutes);
app.route('/threads', threadRoutes);

// Root
app.get('/', (c) => {
  return c.json({
    name: 'WoaSobi API',
    version: '0.2.0',
    endpoints: [
      'POST /agent - Run agent (SSE)',
      'POST /agent/stop/:sessionId - Stop agent',
      'GET /health - Health check',
      'GET /projects - List projects',
      'POST /projects - Add project',
      'DELETE /projects/:id - Remove project',
      'POST /projects/discover - Auto-discover projects',
      'GET /threads - List threads',
      'POST /threads - Create thread',
      'PATCH /threads/:id - Update thread',
      'DELETE /threads/:id - Delete thread',
      'GET /threads/:id/messages - Get messages',
    ],
  });
});

const port = parseInt(process.env.PORT || '2026');

// Initialize data directory and start server
ensureDataDir().then(() => {
  console.log(`[WoaSobi API] Starting on port ${port}...`);

  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[WoaSobi API] Running at http://localhost:${info.port}`);
  });

  // Graceful shutdown
  function shutdown() {
    console.log('[WoaSobi API] Shutting down...');
    server.close();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
