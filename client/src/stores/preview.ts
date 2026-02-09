import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  ArtifactItem,
  ArtifactViewport,
  GitChange,
  PreviewFileSelectionSource,
  PreviewImageItem,
  TerminalLine,
  TerminalSession,
  FileTreeNode,
} from "@/types";
import {
  fetchProjectFiles,
  fetchGitStatus,
  stageFiles,
  unstageFiles,
  revertFiles,
  commitChanges,
  fetchBranches,
  checkoutBranch,
  stageAllFiles,
  unstageAllFiles,
  discardAllChanges,
  fetchSyncStatus,
  gitPush,
  gitPull,
} from "@/lib/api/data";

interface PreviewStore {
  // Active project context
  activeProjectId: string | null;
  activeProjectPath: string | null;
  activeProjectName: string | null;

  // Git changes
  allChanges: GitChange[];
  changesLoading: boolean;
  commitMessage: string;
  commitLoading: boolean;
  collapsedGroups: { staged: boolean; unstaged: boolean };
  expandedFiles: string[];
  selectedFile: string | null;

  // Git branches
  currentBranch: string;
  branches: string[];
  branchesLoading: boolean;

  // Git sync
  aheadCount: number;
  behindCount: number;
  syncLoading: boolean;

  // Artifacts
  artifacts: ArtifactItem[];
  selectedArtifactId: string | null;
  artifactViewport: ArtifactViewport;
  artifactRefreshing: boolean;
  artifactError: string | null;

  // Terminal
  terminalSessions: TerminalSession[];
  activeTerminalSessionId: string;
  terminalRunning: boolean;
  terminalAutoScroll: boolean;

  // Images
  images: PreviewImageItem[];
  selectedImageId: string | null;
  isRegeneratingImage: boolean;

  // File tree
  filesTree: FileTreeNode[];
  filesQuery: string;
  filesLoading: boolean;
  expandedDirs: string[];
  selectedPath: string | null;
  selectedPathSource: PreviewFileSelectionSource | null;
  touchedFiles: string[];

  // Project context
  setActiveProject: (id: string | null, path: string | null, name: string | null) => void;

  // Changes actions
  toggleChangeGroup: (group: "staged" | "unstaged") => void;
  toggleFileExpanded: (path: string) => void;
  toggleStage: (path: string, currentlyStaged?: boolean) => void;
  revertChange: (path: string) => void;
  discardChange: (path: string) => void;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  discardAll: () => Promise<void>;
  selectFile: (path: string, source: PreviewFileSelectionSource) => void;
  loadGitStatus: (projectId: string, force?: boolean) => Promise<void>;
  setCommitMessage: (msg: string) => void;
  commitStaged: () => Promise<{ ok: boolean; error?: string }>;
  commitAll: () => Promise<{ ok: boolean; error?: string }>;

  // Branch actions
  loadBranches: (projectId: string) => Promise<void>;
  switchBranch: (branch: string) => Promise<{ ok: boolean; error?: string }>;

  // Sync actions
  loadSyncStatus: (projectId: string) => Promise<void>;
  syncPush: () => Promise<{ ok: boolean; error?: string }>;
  syncPull: () => Promise<{ ok: boolean; error?: string }>;

  // Artifact actions
  setArtifactViewport: (mode: ArtifactViewport) => void;
  selectArtifact: (id: string) => void;
  refreshArtifact: () => void;
  extractArtifactsFromText: (text: string) => void;
  addArtifact: (title: string, html: string) => void;
  clearArtifacts: () => void;

  // Terminal actions
  switchTerminalSession: (id: string) => void;
  addTerminalSession: () => void;
  addRealTerminalSession: () => Promise<void>;
  closeTerminalSession: (id: string) => void;
  appendTerminalLine: (line: Omit<TerminalLine, "id">) => void;
  appendTerminalLineToSession: (sessionId: string, line: Omit<TerminalLine, "id">) => void;
  clearTerminalSession: (id: string) => void;
  clearActiveTerminal: () => void;
  setTerminalRunning: (running: boolean) => void;
  stopTerminal: () => void;
  execCommand: (command: string) => Promise<void>;

  // Image actions
  selectImage: (id: string) => void;

  // File tree actions
  setFilesQuery: (query: string) => void;
  toggleDirExpanded: (path: string) => void;
  loadFiles: (projectId: string) => Promise<void>;
  addTouchedFile: (path: string) => void;
  clearTouchedFiles: () => void;
}

let _gitStatusPending = false;

export const usePreviewStore = create<PreviewStore>((set, get) => ({
  // Active project context
  activeProjectId: null,
  activeProjectPath: null,
  activeProjectName: null,

  // Git changes — start empty
  allChanges: [],
  changesLoading: false,
  commitMessage: "",
  commitLoading: false,
  collapsedGroups: { staged: false, unstaged: false },
  expandedFiles: [],
  selectedFile: null,

  // Git branches
  currentBranch: "main",
  branches: [],
  branchesLoading: false,

  // Git sync
  aheadCount: 0,
  behindCount: 0,
  syncLoading: false,

  // Artifacts — start empty
  artifacts: [],
  selectedArtifactId: null,
  artifactViewport: "desktop",
  artifactRefreshing: false,
  artifactError: null,

  // Terminal — start empty, sessions created on demand
  terminalSessions: [],
  activeTerminalSessionId: "",
  terminalRunning: false,
  terminalAutoScroll: true,

  // Images — start empty
  images: [],
  selectedImageId: null,
  isRegeneratingImage: false,

  // File tree — start empty
  filesTree: [],
  filesQuery: "",
  filesLoading: false,
  expandedDirs: [],
  selectedPath: null,
  selectedPathSource: null,
  touchedFiles: [],

  // --- Project context ---
  setActiveProject: (id, path, name) => {
    const prev = get().activeProjectId;
    set({ activeProjectId: id, activeProjectPath: path, activeProjectName: name });
    // Load data when project changes
    if (id && id !== prev) {
      get().loadFiles(id);
      get().loadGitStatus(id);
      get().loadBranches(id);
      get().loadSyncStatus(id);
    }
  },

  // --- Changes ---
  toggleChangeGroup: (group) =>
    set((state) => ({
      collapsedGroups: {
        ...state.collapsedGroups,
        [group]: !state.collapsedGroups[group],
      },
    })),
  toggleFileExpanded: (path) =>
    set((state) => ({
      expandedFiles: state.expandedFiles.includes(path)
        ? state.expandedFiles.filter((item) => item !== path)
        : [...state.expandedFiles, path],
    })),
  toggleStage: async (path, currentlyStaged?) => {
    const { allChanges, activeProjectId } = get();
    if (!activeProjectId) return;
    const change = currentlyStaged !== undefined
      ? allChanges.find((c) => c.file === path && c.staged === currentlyStaged)
      : allChanges.find((c) => c.file === path);
    if (!change) return;
    try {
      if (change.staged) {
        await unstageFiles(activeProjectId, [path]);
      } else {
        await stageFiles(activeProjectId, [path]);
      }
    } catch {
      // Operation failed — still refresh below
    }
    await get().loadGitStatus(activeProjectId, true);
  },
  revertChange: async (path) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    try {
      await revertFiles(activeProjectId, [path]);
    } catch {
      // Operation failed — still refresh below
    }
    await get().loadGitStatus(activeProjectId, true);
  },
  discardChange: async (path) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    try {
      await revertFiles(activeProjectId, [path]);
    } catch {
      // Operation failed — still refresh below
    }
    await get().loadGitStatus(activeProjectId, true);
  },
  stageAll: async () => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    try {
      await stageAllFiles(activeProjectId);
    } catch {
      // Operation failed — still refresh below
    }
    await get().loadGitStatus(activeProjectId, true);
  },
  unstageAll: async () => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    try {
      await unstageAllFiles(activeProjectId);
    } catch {
      // Operation failed — still refresh below
    }
    await get().loadGitStatus(activeProjectId, true);
  },
  discardAll: async () => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    try {
      await discardAllChanges(activeProjectId);
    } catch {
      // Operation failed — still refresh below
    }
    await get().loadGitStatus(activeProjectId, true);
  },
  selectFile: (path, source) =>
    set((state) => {
      const fileSegments = path.split("/");
      const dirsToOpen: string[] = [];
      for (let i = 0; i < fileSegments.length - 1; i += 1) {
        dirsToOpen.push(fileSegments.slice(0, i + 1).join("/"));
      }
      return {
        selectedFile: path,
        selectedPath: path,
        selectedPathSource: source,
        expandedDirs: Array.from(new Set([...state.expandedDirs, ...dirsToOpen])),
      };
    }),
  loadGitStatus: async (projectId, force?) => {
    // Guard against concurrent requests (polling overlap), but allow force refresh after actions
    if (_gitStatusPending && !force) return;
    _gitStatusPending = true;
    // Only show loading spinner on first load
    if (get().allChanges.length === 0) set({ changesLoading: true });
    try {
      const changes = await fetchGitStatus(projectId);
      // Only update store if data actually changed — avoids unnecessary re-renders from polling
      const prev = get().allChanges;
      const changed =
        changes.length !== prev.length ||
        changes.some((c, i) =>
          c.file !== prev[i].file ||
          c.staged !== prev[i].staged ||
          c.status !== prev[i].status ||
          c.additions !== prev[i].additions ||
          c.deletions !== prev[i].deletions
        );
      if (changed) {
        set({ allChanges: changes, changesLoading: false });
      } else if (get().changesLoading) {
        set({ changesLoading: false });
      }
    } catch {
      set({ changesLoading: false });
    } finally {
      _gitStatusPending = false;
    }
  },
  setCommitMessage: (msg) => set({ commitMessage: msg }),
  commitStaged: async () => {
    const { activeProjectId, commitMessage } = get();
    if (!activeProjectId || !commitMessage.trim()) {
      return { ok: false, error: "No project or empty message" };
    }
    set({ commitLoading: true });
    try {
      await commitChanges(activeProjectId, commitMessage.trim());
      set({ commitMessage: "", commitLoading: false });
      await Promise.all([
        get().loadGitStatus(activeProjectId, true),
        get().loadSyncStatus(activeProjectId),
      ]);
      return { ok: true };
    } catch (e) {
      set({ commitLoading: false });
      // Refresh git status on failure — UI may be showing stale staged/unstaged state
      await get().loadGitStatus(activeProjectId, true);
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
  commitAll: async () => {
    const { activeProjectId, commitMessage } = get();
    if (!activeProjectId || !commitMessage.trim()) {
      return { ok: false, error: "No project or empty message" };
    }
    set({ commitLoading: true });
    try {
      // Stage all then commit (same as VS Code behavior when nothing staged)
      await stageAllFiles(activeProjectId);
      await commitChanges(activeProjectId, commitMessage.trim());
      set({ commitMessage: "", commitLoading: false });
      await Promise.all([
        get().loadGitStatus(activeProjectId, true),
        get().loadSyncStatus(activeProjectId),
      ]);
      return { ok: true };
    } catch (e) {
      set({ commitLoading: false });
      // Refresh git status on failure
      await get().loadGitStatus(activeProjectId, true);
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  // --- Branches ---
  loadBranches: async (projectId) => {
    set({ branchesLoading: true });
    try {
      const { current, branches } = await fetchBranches(projectId);
      set({ currentBranch: current, branches, branchesLoading: false });
    } catch {
      set({ branchesLoading: false });
    }
  },
  switchBranch: async (branch) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return { ok: false, error: "No active project" };
    try {
      await checkoutBranch(activeProjectId, branch);
      set({ currentBranch: branch });
      // Refresh file tree and git status after branch switch
      await Promise.all([
        get().loadFiles(activeProjectId),
        get().loadGitStatus(activeProjectId, true),
      ]);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  // --- Sync ---
  loadSyncStatus: async (projectId) => {
    try {
      const { ahead, behind } = await fetchSyncStatus(projectId);
      const { aheadCount, behindCount } = get();
      if (ahead !== aheadCount || behind !== behindCount) {
        set({ aheadCount: ahead, behindCount: behind });
      }
    } catch {
      // No upstream or fetch failed — keep current counts
    }
  },
  syncPush: async () => {
    const { activeProjectId } = get();
    if (!activeProjectId) return { ok: false, error: "No active project" };
    set({ syncLoading: true });
    try {
      await gitPush(activeProjectId);
      await get().loadSyncStatus(activeProjectId);
      set({ syncLoading: false });
      return { ok: true };
    } catch (e) {
      set({ syncLoading: false });
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
  syncPull: async () => {
    const { activeProjectId } = get();
    if (!activeProjectId) return { ok: false, error: "No active project" };
    set({ syncLoading: true });
    try {
      await gitPull(activeProjectId);
      await Promise.all([
        get().loadSyncStatus(activeProjectId),
        get().loadGitStatus(activeProjectId, true),
      ]);
      set({ syncLoading: false });
      return { ok: true };
    } catch (e) {
      set({ syncLoading: false });
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  // --- Artifacts ---
  setArtifactViewport: (mode) => set({ artifactViewport: mode }),
  selectArtifact: (id) => set({ selectedArtifactId: id, artifactError: null }),
  refreshArtifact: () => {
    // Re-render: toggle refreshing briefly to force iframe reload
    set({ artifactRefreshing: true });
    window.setTimeout(() => set({ artifactRefreshing: false }), 100);
  },
  extractArtifactsFromText: (text) => {
    const htmlBlockRegex = /```html\s*\n([\s\S]*?)```/gi;
    const artifacts: ArtifactItem[] = [];
    let match;
    let index = 0;

    while ((match = htmlBlockRegex.exec(text)) !== null) {
      const html = match[1].trim();
      // Only substantial HTML with actual markup
      if (html.length > 50 && /<[a-z][\s\S]*>/i.test(html)) {
        artifacts.push({
          id: `artifact-html-${index}`,
          title: `HTML Preview ${index + 1}`,
          html,
          status: "ready",
          updatedAt: new Date().toISOString(),
        });
        index++;
      }
    }

    if (artifacts.length > 0) {
      set({
        artifacts,
        selectedArtifactId: artifacts[0].id,
      });
    }
  },
  addArtifact: (title, html) => {
    const artifact: ArtifactItem = {
      id: `artifact-${nanoid(6)}`,
      title,
      html,
      status: "ready",
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      artifacts: [...state.artifacts, artifact],
      selectedArtifactId: artifact.id,
    }));
  },
  clearArtifacts: () => set({ artifacts: [], selectedArtifactId: null }),

  // --- Terminal ---
  switchTerminalSession: (id) => set({ activeTerminalSessionId: id }),
  addTerminalSession: () =>
    set((state) => {
      const index = state.terminalSessions.length + 1;
      const newSession: TerminalSession = {
        id: `term-${nanoid(6)}`,
        name: `Terminal ${index}`,
        lines: [],
      };
      return {
        terminalSessions: [...state.terminalSessions, newSession],
        activeTerminalSessionId: newSession.id,
      };
    }),
  addRealTerminalSession: async () => {
    const { activeProjectId, terminalSessions } = get();
    if (!activeProjectId) {
      // No project — fallback to local-only session
      get().addTerminalSession();
      return;
    }
    const index = terminalSessions.length + 1;
    const newSession: TerminalSession = {
      id: `term-${nanoid(6)}`,
      name: `Shell ${index}`,
      lines: [],
      projectId: activeProjectId,
    };
    set({
      terminalSessions: [...terminalSessions, newSession],
      activeTerminalSessionId: newSession.id,
    });
  },
  closeTerminalSession: (id) => {
    const state = get();
    const sessions = state.terminalSessions.filter((s) => s.id !== id);
    const activeTerminalSessionId =
      state.activeTerminalSessionId === id
        ? (sessions[0]?.id ?? "")
        : state.activeTerminalSessionId;
    set({ terminalSessions: sessions, activeTerminalSessionId });
    // WebSocket cleanup happens automatically when XTerminal unmounts
  },
  appendTerminalLine: (line) =>
    set((state) => {
      // Find agent session (no projectId) to append to
      const agentSession = state.terminalSessions.find((s) => !s.projectId);
      if (!agentSession) {
        // Create an agent output session on the fly
        const newSession: TerminalSession = {
          id: `term-agent-${nanoid(6)}`,
          name: "Agent",
          lines: [{ id: `line-${nanoid(6)}`, ...line }],
        };
        return {
          terminalSessions: [newSession, ...state.terminalSessions],
          activeTerminalSessionId: newSession.id,
        };
      }
      return {
        terminalSessions: state.terminalSessions.map((session) =>
          session.id === agentSession.id
            ? {
                ...session,
                lines: [...session.lines, { id: `line-${nanoid(6)}`, ...line }],
              }
            : session
        ),
        activeTerminalSessionId: agentSession.id,
      };
    }),
  appendTerminalLineToSession: (sessionId, line) =>
    set((state) => ({
      terminalSessions: state.terminalSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              lines: [...session.lines, { id: `line-${nanoid(6)}`, ...line }],
            }
          : session
      ),
    })),
  clearTerminalSession: (id) =>
    set((state) => ({
      terminalSessions: state.terminalSessions.map((session) =>
        session.id === id ? { ...session, lines: [] } : session
      ),
    })),
  clearActiveTerminal: () =>
    set((state) => ({
      // Clear agent output sessions (no projectId), remove them entirely
      terminalSessions: state.terminalSessions.filter((s) => !!s.projectId),
      activeTerminalSessionId: state.terminalSessions.find((s) => !!s.projectId)?.id ?? "",
    })),
  setTerminalRunning: (running) => set({ terminalRunning: running }),
  stopTerminal: () => set({ terminalRunning: false }),
  execCommand: async () => {
    // Interactive shells are handled directly by XTerminal via WebSocket
    // Agent output is handled by appendTerminalLine from chat.ts
  },

  // --- Images ---
  selectImage: (id) => set({ selectedImageId: id }),

  // --- File tree ---
  setFilesQuery: (query) => set({ filesQuery: query }),
  toggleDirExpanded: (path) =>
    set((state) => ({
      expandedDirs: state.expandedDirs.includes(path)
        ? state.expandedDirs.filter((item) => item !== path)
        : [...state.expandedDirs, path],
    })),
  loadFiles: async (projectId) => {
    set({ filesLoading: true });
    try {
      const tree = await fetchProjectFiles(projectId);
      // Auto-expand top-level directories
      const topDirs = tree.filter((n) => n.type === "directory").map((n) => n.path);
      set((state) => ({
        filesTree: tree,
        filesLoading: false,
        expandedDirs: Array.from(new Set([...state.expandedDirs, ...topDirs])),
      }));
    } catch {
      set({ filesTree: [], filesLoading: false });
    }
  },
  addTouchedFile: (path) =>
    set((state) => ({
      touchedFiles: state.touchedFiles.includes(path)
        ? state.touchedFiles
        : [...state.touchedFiles, path],
    })),
  clearTouchedFiles: () => set({ touchedFiles: [] }),
}));
