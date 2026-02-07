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
} from "@/lib/api/data";

type ChangesFilter = "all" | "staged" | "unstaged";

interface PreviewStore {
  // Active project context
  activeProjectId: string | null;
  activeProjectPath: string | null;
  activeProjectName: string | null;

  // Git changes
  allChanges: GitChange[];
  changesFilter: ChangesFilter;
  changesLoading: boolean;
  collapsedGroups: { staged: boolean; unstaged: boolean };
  expandedFiles: string[];
  selectedFile: string | null;

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
  setChangesFilter: (filter: ChangesFilter) => void;
  toggleChangeGroup: (group: "staged" | "unstaged") => void;
  toggleFileExpanded: (path: string) => void;
  toggleStage: (path: string) => void;
  revertChange: (path: string) => void;
  selectFile: (path: string, source: PreviewFileSelectionSource) => void;
  loadGitStatus: (projectId: string) => Promise<void>;

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
  closeTerminalSession: (id: string) => void;
  appendTerminalLine: (line: Omit<TerminalLine, "id">) => void;
  clearTerminalSession: (id: string) => void;
  clearActiveTerminal: () => void;
  setTerminalRunning: (running: boolean) => void;
  stopTerminal: () => void;

  // Image actions
  selectImage: (id: string) => void;

  // File tree actions
  setFilesQuery: (query: string) => void;
  toggleDirExpanded: (path: string) => void;
  loadFiles: (projectId: string) => Promise<void>;
  addTouchedFile: (path: string) => void;
  clearTouchedFiles: () => void;
}

const defaultSession: TerminalSession = {
  id: "term-agent",
  name: "Agent",
  lines: [],
};

export const usePreviewStore = create<PreviewStore>((set, get) => ({
  // Active project context
  activeProjectId: null,
  activeProjectPath: null,
  activeProjectName: null,

  // Git changes — start empty
  allChanges: [],
  changesFilter: "all",
  changesLoading: false,
  collapsedGroups: { staged: false, unstaged: false },
  expandedFiles: [],
  selectedFile: null,

  // Artifacts — start empty
  artifacts: [],
  selectedArtifactId: null,
  artifactViewport: "desktop",
  artifactRefreshing: false,
  artifactError: null,

  // Terminal — start with one empty session
  terminalSessions: [{ ...defaultSession }],
  activeTerminalSessionId: defaultSession.id,
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
    }
  },

  // --- Changes ---
  setChangesFilter: (filter) => set({ changesFilter: filter }),
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
  toggleStage: async (path) => {
    const { allChanges, activeProjectId } = get();
    if (!activeProjectId) return;
    const change = allChanges.find((c) => c.file === path);
    if (!change) return;
    try {
      if (change.staged) {
        await unstageFiles(activeProjectId, [path]);
      } else {
        await stageFiles(activeProjectId, [path]);
      }
      await get().loadGitStatus(activeProjectId);
    } catch {
      // Failed
    }
  },
  revertChange: async (path) => {
    const { activeProjectId } = get();
    if (!activeProjectId) return;
    try {
      await revertFiles(activeProjectId, [path]);
      await get().loadGitStatus(activeProjectId);
    } catch {
      // Failed
    }
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
  loadGitStatus: async (projectId) => {
    set({ changesLoading: true });
    try {
      const changes = await fetchGitStatus(projectId);
      set({ allChanges: changes, changesLoading: false });
    } catch {
      set({ allChanges: [], changesLoading: false });
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
  closeTerminalSession: (id) =>
    set((state) => {
      if (state.terminalSessions.length === 1) return state;
      const sessions = state.terminalSessions.filter((session) => session.id !== id);
      const activeTerminalSessionId =
        state.activeTerminalSessionId === id ? sessions[0].id : state.activeTerminalSessionId;
      return { terminalSessions: sessions, activeTerminalSessionId };
    }),
  appendTerminalLine: (line) =>
    set((state) => ({
      terminalSessions: state.terminalSessions.map((session) =>
        session.id === state.activeTerminalSessionId
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
      terminalSessions: state.terminalSessions.map((session) =>
        session.id === state.activeTerminalSessionId ? { ...session, lines: [] } : session
      ),
    })),
  setTerminalRunning: (running) => set({ terminalRunning: running }),
  stopTerminal: () => set({ terminalRunning: false }),

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
