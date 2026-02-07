import { Hono } from 'hono';
import { findClaudeCode } from '../agents/claude.js';
import { findCodex } from '../agents/codex.js';

const health = new Hono();

// Cache CLI detection results (re-check every 60s)
let cliCache: { claude: boolean; codex: boolean; checkedAt: number } | null = null;
const CLI_CACHE_TTL = 60_000;

function detectCLIs() {
  const now = Date.now();
  if (cliCache && now - cliCache.checkedAt < CLI_CACHE_TTL) {
    return cliCache;
  }
  cliCache = {
    claude: !!findClaudeCode(),
    codex: !!findCodex(),
    checkedAt: now,
  };
  return cliCache;
}

health.get('/', (c) => {
  const clis = detectCLIs();
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    clis: {
      claude: clis.claude,
      codex: clis.codex,
    },
  });
});

export default health;
