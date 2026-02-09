import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { basename, join, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadProjects, saveProjects, loadAllThreads, saveThread, deleteThread as deleteStoredThread, type StoredThread } from '../storage/index.js';
import { discoverAndMerge, discoverClaudeSessions, discoverCodexSessions } from '../storage/discover.js';

const execFileAsync = promisify(execFile);

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

// Update a project (e.g. toggle pinned)
projects.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ pinned?: boolean }>();
  const existing = await loadProjects();
  const idx = existing.findIndex((p) => p.id === id);

  if (idx === -1) {
    return c.json({ error: 'project not found' }, 404);
  }

  if (body.pinned !== undefined) existing[idx].pinned = body.pinned;
  await saveProjects(existing);
  return c.json(existing[idx]);
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

// Delete all threads for a project
projects.delete('/:id/threads', async (c) => {
  const id = c.req.param('id');
  const allThreads = await loadAllThreads();
  const toDelete = allThreads.filter((t) => t.projectId === id);

  for (const t of toDelete) {
    await deleteStoredThread(t.id);
  }

  return c.json({ deleted: toDelete.length });
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

// --- File Tree ---

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv', '.tox', 'target',
  '.idea', '.vscode', '.DS_Store', 'coverage', '.turbo',
  '.cache', '.parcel-cache', '.svelte-kit', '.output',
]);

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  ext?: string;
}

async function buildTree(
  absPath: string,
  relativePath: string,
  depth: number,
  maxDepth: number
): Promise<FileNode[]> {
  if (depth >= maxDepth) return [];

  let entries;
  try {
    entries = await readdir(absPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes: FileNode[] = [];

  // Sort: directories first, then files, both alphabetical
  const sorted = entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of sorted) {
    if (entry.name.startsWith('.')) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;

    const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const children = await buildTree(join(absPath, entry.name), relPath, depth + 1, maxDepth);
      nodes.push({ name: entry.name, path: relPath, type: 'directory', children });
    } else {
      const ext = extname(entry.name).slice(1);
      nodes.push({ name: entry.name, path: relPath, type: 'file', ext: ext || undefined });
    }
  }

  return nodes;
}

// GET /:id/files - Read project directory tree
projects.get('/:id/files', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);

  if (!project) return c.json({ error: 'project not found' }, 404);
  if (!existsSync(project.path)) return c.json({ error: 'project path not found' }, 404);

  const maxDepth = parseInt(c.req.query('depth') || '5');
  const tree = await buildTree(project.path, '', 0, maxDepth);

  return c.json(tree);
});

// --- Git Operations ---

/**
 * Parse a file path from git status --porcelain output.
 * Handles:
 * - Quoted paths with escaped characters (e.g. "path with spaces/file.txt")
 * - Renamed files "old -> new" format
 * - Regular paths
 */
function parseGitPath(raw: string): { file: string; origFile?: string } {
  let s = raw.trim();

  // Git quotes paths with special chars (spaces, unicode, etc.)
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\t/g, '\t').replace(/\\n/g, '\n');
  }

  // Handle rename: "old -> new" or old -> new
  const arrowIdx = s.indexOf(' -> ');
  if (arrowIdx !== -1) {
    let origPart = s.slice(0, arrowIdx);
    let newPart = s.slice(arrowIdx + 4);
    // Each part might also be quoted
    if (origPart.startsWith('"') && origPart.endsWith('"')) {
      origPart = origPart.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (newPart.startsWith('"') && newPart.endsWith('"')) {
      newPart = newPart.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    return { file: newPart, origFile: origPart };
  }

  return { file: s };
}

type GitChangeStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';

// GET /:id/git/status - Git status with diffs
projects.get('/:id/git/status', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain=v1'], {
      cwd: project.path,
      maxBuffer: 1024 * 1024,
    });

    const changes: Array<{
      file: string;
      origFile?: string;
      status: GitChangeStatus;
      staged: boolean;
      additions: number;
      deletions: number;
      diff: string;
    }> = [];

    for (const line of statusOut.trimEnd().split('\n').filter(l => l.length >= 3)) {
      const indexStatus = line[0];
      const wtStatus = line[1];
      const rawPath = line.slice(3);
      const parsed = parseGitPath(rawPath);

      // Determine if this entry has a staged component
      const hasStaged = indexStatus !== ' ' && indexStatus !== '?';
      // Untracked files (??) should be shown as unstaged additions
      const isUntracked = indexStatus === '?' && wtStatus === '?';
      const hasUnstaged = wtStatus !== ' ' || isUntracked;

      // Process staged entry
      if (hasStaged) {
        let status: GitChangeStatus = 'modified';
        if (indexStatus === 'A') status = 'added';
        else if (indexStatus === 'D') status = 'deleted';
        else if (indexStatus === 'R') status = 'renamed';

        let diff = '';
        try {
          const diffArgs = indexStatus === 'R' && parsed.origFile
            ? ['diff', '--cached', '--', parsed.origFile, parsed.file]
            : ['diff', '--cached', '--', parsed.file];
          const { stdout } = await execFileAsync('git', diffArgs, {
            cwd: project.path,
            maxBuffer: 1024 * 1024,
          });
          diff = stdout;
        } catch { /* no diff */ }

        let additions = 0, deletions = 0;
        for (const dLine of diff.split('\n')) {
          if (dLine.startsWith('+') && !dLine.startsWith('+++')) additions++;
          if (dLine.startsWith('-') && !dLine.startsWith('---')) deletions++;
        }

        changes.push({
          file: parsed.file,
          origFile: parsed.origFile,
          status,
          staged: true,
          additions,
          deletions,
          diff,
        });
      }

      // Process unstaged / untracked entry
      if (hasUnstaged && wtStatus !== '?') {
        // Normal unstaged change (not untracked)
        let status: GitChangeStatus = 'modified';
        if (wtStatus === 'D') status = 'deleted';

        let diff = '';
        try {
          const { stdout } = await execFileAsync('git', ['diff', '--', parsed.file], {
            cwd: project.path,
            maxBuffer: 1024 * 1024,
          });
          diff = stdout;
        } catch { /* no diff */ }

        let additions = 0, deletions = 0;
        for (const dLine of diff.split('\n')) {
          if (dLine.startsWith('+') && !dLine.startsWith('+++')) additions++;
          if (dLine.startsWith('-') && !dLine.startsWith('---')) deletions++;
        }

        changes.push({ file: parsed.file, status, staged: false, additions, deletions, diff });
      } else if (isUntracked) {
        // Untracked file — show as unstaged "added"
        let diff = '';
        let additions = 0;
        try {
          const result = await execFileAsync('git', ['diff', '--no-index', '--', '/dev/null', parsed.file], {
            cwd: project.path,
            maxBuffer: 1024 * 1024,
          }).catch((e: { stdout?: string }) => ({ stdout: e.stdout || '' }));
          diff = result.stdout;
        } catch { /* no diff for untracked */ }

        for (const dLine of diff.split('\n')) {
          if (dLine.startsWith('+') && !dLine.startsWith('+++')) additions++;
        }

        changes.push({
          file: parsed.file,
          status: 'untracked',
          staged: false,
          additions,
          deletions: 0,
          diff,
        });
      }
    }

    return c.json(changes);
  } catch {
    return c.json([], 200);
  }
});

// POST /:id/git/stage - Stage files
projects.post('/:id/git/stage', async (c) => {
  const id = c.req.param('id');
  const { files: filePaths } = await c.req.json<{ files: string[] }>();
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    await execFileAsync('git', ['add', '--', ...filePaths], { cwd: project.path });
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// POST /:id/git/unstage - Unstage files
projects.post('/:id/git/unstage', async (c) => {
  const id = c.req.param('id');
  const { files: filePaths } = await c.req.json<{ files: string[] }>();
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    await execFileAsync('git', ['restore', '--staged', '--', ...filePaths], { cwd: project.path });
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// POST /:id/git/revert - Revert/discard file changes (handles both tracked and untracked)
projects.post('/:id/git/revert', async (c) => {
  const id = c.req.param('id');
  const { files: filePaths } = await c.req.json<{ files: string[] }>();
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    // Get current status to distinguish tracked vs untracked
    const { stdout: statusOut } = await execFileAsync('git', ['status', '--porcelain=v1'], {
      cwd: project.path,
      maxBuffer: 1024 * 1024,
    });

    const untrackedSet = new Set<string>();
    for (const line of statusOut.trimEnd().split('\n').filter(l => l.length >= 3)) {
      if (line[0] === '?' && line[1] === '?') {
        const parsed = parseGitPath(line.slice(3));
        untrackedSet.add(parsed.file);
      }
    }

    const trackedFiles = filePaths.filter((fp) => !untrackedSet.has(fp));
    const untrackedFiles = filePaths.filter((fp) => untrackedSet.has(fp));

    if (trackedFiles.length > 0) {
      await execFileAsync('git', ['checkout', '--', ...trackedFiles], { cwd: project.path });
    }
    if (untrackedFiles.length > 0) {
      await execFileAsync('git', ['clean', '-f', '--', ...untrackedFiles], { cwd: project.path });
    }

    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// POST /:id/git/commit - Commit staged changes
projects.post('/:id/git/commit', async (c) => {
  const id = c.req.param('id');
  const { message } = await c.req.json<{ message: string }>();
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);
  if (!message?.trim()) return c.json({ error: 'commit message is required' }, 400);

  try {
    const { stdout } = await execFileAsync('git', ['commit', '-m', message.trim()], {
      cwd: project.path,
      maxBuffer: 1024 * 1024,
    });
    return c.json({ ok: true, output: stdout.trim() });
  } catch (error) {
    let msg: string;
    if (error instanceof Error) {
      const e = error as Error & { stderr?: string; stdout?: string };
      const raw = [e.stderr, e.stdout].filter(Boolean).join('\n').trim() || e.message;
      // Provide cleaner error messages for common git commit failures
      if (raw.includes('nothing to commit') || raw.includes('no changes added to commit')) {
        msg = 'Nothing to commit — no staged changes found.';
      } else if (raw.includes('Changes not staged for commit')) {
        msg = 'No staged changes to commit. Stage files first or use "Commit All".';
      } else {
        msg = raw;
      }
    } else {
      msg = String(error);
    }
    return c.json({ error: msg }, 500);
  }
});

// GET /:id/git/branches - List branches + current
projects.get('/:id/git/branches', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    const { stdout } = await execFileAsync('git', ['branch', '--no-color'], {
      cwd: project.path,
      maxBuffer: 1024 * 1024,
    });

    let current = 'main';
    const branches: string[] = [];

    for (const line of stdout.trim().split('\n').filter(Boolean)) {
      const name = line.replace(/^\*?\s+/, '').trim();
      if (!name || name.startsWith('(')) continue;
      branches.push(name);
      if (line.startsWith('*')) current = name;
    }

    return c.json({ current, branches });
  } catch {
    return c.json({ current: 'main', branches: ['main'] });
  }
});

// POST /:id/git/checkout - Switch branch
projects.post('/:id/git/checkout', async (c) => {
  const id = c.req.param('id');
  const { branch } = await c.req.json<{ branch: string }>();
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);
  if (!branch?.trim()) return c.json({ error: 'branch name is required' }, 400);

  try {
    await execFileAsync('git', ['checkout', branch.trim()], {
      cwd: project.path,
      maxBuffer: 1024 * 1024,
    });
    return c.json({ ok: true, branch: branch.trim() });
  } catch (error) {
    let msg: string;
    if (error instanceof Error) {
      const e = error as Error & { stderr?: string; stdout?: string };
      msg = [e.stderr, e.stdout].filter(Boolean).join('\n').trim() || e.message;
    } else {
      msg = String(error);
    }
    return c.json({ error: msg }, 500);
  }
});

// POST /:id/git/stage-all - Stage all changes
projects.post('/:id/git/stage-all', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    await execFileAsync('git', ['add', '-A'], { cwd: project.path });
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// POST /:id/git/unstage-all - Unstage all staged changes
projects.post('/:id/git/unstage-all', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    await execFileAsync('git', ['restore', '--staged', '.'], { cwd: project.path });
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// POST /:id/git/discard-all - Discard all unstaged changes (tracked + untracked)
projects.post('/:id/git/discard-all', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    await execFileAsync('git', ['checkout', '--', '.'], { cwd: project.path });
    await execFileAsync('git', ['clean', '-fd'], { cwd: project.path });
    return c.json({ ok: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// GET /:id/git/sync-status - Ahead/behind counts relative to upstream
projects.get('/:id/git/sync-status', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    const { stdout } = await execFileAsync(
      'git', ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
      { cwd: project.path },
    );
    const parts = stdout.trim().split(/\s+/);
    const behind = parseInt(parts[0]) || 0;
    const ahead = parseInt(parts[1]) || 0;
    return c.json({ ahead, behind });
  } catch {
    // No upstream configured or other error
    return c.json({ ahead: 0, behind: 0 });
  }
});

// POST /:id/git/push - Push to remote
projects.post('/:id/git/push', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    const { stdout } = await execFileAsync('git', ['push'], {
      cwd: project.path,
      maxBuffer: 1024 * 1024,
      timeout: 30000,
    });
    return c.json({ ok: true, output: stdout.trim() });
  } catch (error) {
    let msg: string;
    if (error instanceof Error) {
      const e = error as Error & { stderr?: string; stdout?: string };
      const raw = [e.stderr, e.stdout].filter(Boolean).join('\n').trim() || e.message;
      if (raw.includes('no upstream branch') || raw.includes('has no upstream')) {
        msg = 'No upstream branch configured. Run "git push -u origin <branch>" first.';
      } else if (raw.includes('rejected')) {
        msg = 'Push rejected — remote has changes. Pull first.';
      } else {
        msg = raw;
      }
    } else {
      msg = String(error);
    }
    return c.json({ error: msg }, 500);
  }
});

// POST /:id/git/pull - Pull from remote
projects.post('/:id/git/pull', async (c) => {
  const id = c.req.param('id');
  const projectList = await loadProjects();
  const project = projectList.find((p) => p.id === id);
  if (!project) return c.json({ error: 'project not found' }, 404);

  try {
    const { stdout } = await execFileAsync('git', ['pull'], {
      cwd: project.path,
      maxBuffer: 1024 * 1024,
      timeout: 30000,
    });
    return c.json({ ok: true, output: stdout.trim() });
  } catch (error) {
    let msg: string;
    if (error instanceof Error) {
      const e = error as Error & { stderr?: string; stdout?: string };
      const raw = [e.stderr, e.stdout].filter(Boolean).join('\n').trim() || e.message;
      if (raw.includes('CONFLICT') || raw.includes('merge conflict')) {
        msg = 'Pull failed — merge conflicts detected. Resolve conflicts manually.';
      } else {
        msg = raw;
      }
    } else {
      msg = String(error);
    }
    return c.json({ error: msg }, 500);
  }
});

export default projects;
