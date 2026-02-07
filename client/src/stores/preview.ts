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
  Message,
} from "@/types";
import { mockGitChanges } from "@/mocks/git-changes";
import { mockFileTree } from "@/mocks/file-tree";

const artifactHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #334155; }
    .card h3 { font-size: 14px; margin-bottom: 8px; color: #f1f5f9; }
    .card p { font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat { background: #1e293b; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #334155; }
    .stat-value { font-size: 24px; font-weight: 700; color: #818cf8; }
    .stat-label { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    .badge { display: inline-block; font-size: 10px; background: #312e81; color: #a5b4fc; padding: 2px 8px; border-radius: 100px; margin-left: 8px; }
  </style>
</head>
<body>
  <h1>Dashboard <span class="badge">Preview</span></h1>
  <div class="stats">
    <div class="stat"><div class="stat-value">124.5K</div><div class="stat-label">Tokens Used</div></div>
    <div class="stat"><div class="stat-value">47</div><div class="stat-label">Conversations</div></div>
    <div class="stat"><div class="stat-value">99.2%</div><div class="stat-label">Uptime</div></div>
  </div>
  <div class="card"><h3>Recent Activity</h3><p>Fixed shadow database migration error in prisma setup. Updated billing API to handle quota enforcement. Added middleware for API key validation.</p></div>
  <div class="card"><h3>Quick Actions</h3><p>Create new conversation, review code changes, manage workspace settings, configure model providers.</p></div>
</body>
</html>`;

const imageOne = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#16213e"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#7c3aed"/>
          <stop offset="100%" style="stop-color:#2563eb"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#bg)"/>
      <rect x="20" y="20" width="80" height="360" rx="8" fill="#0f3460" opacity="0.5"/>
      <rect x="110" y="20" width="160" height="360" rx="8" fill="#0f3460" opacity="0.3"/>
      <rect x="280" y="20" width="100" height="360" rx="8" fill="#0f3460" opacity="0.5"/>
      <rect x="30" y="30" width="60" height="8" rx="4" fill="url(#accent)"/>
      <text x="200" y="220" text-anchor="middle" fill="#7c3aed" font-family="system-ui" font-size="14" opacity="0.8">WoaSobi AI</text>
      <text x="200" y="240" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="10" opacity="0.4">Desktop Client Concept</text>
    </svg>`)}`;
const imageTwo = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <radialGradient id="g1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:0.8"/>
          <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="#0f0f23"/>
      <circle cx="200" cy="200" r="150" fill="url(#g1)" opacity="0.4"/>
      <circle cx="200" cy="200" r="6" fill="#a78bfa"/>
      <text x="200" y="350" text-anchor="middle" fill="#a78bfa" font-family="system-ui" font-size="11" opacity="0.6">Neural Network</text>
    </svg>`)}`;

type ChangesFilter = "all" | "staged" | "unstaged";
interface PreviewStore {
  allChanges: GitChange[];
  changesFilter: ChangesFilter;
  collapsedGroups: { staged: boolean; unstaged: boolean };
  expandedFiles: string[];
  selectedFile: string | null;

  artifacts: ArtifactItem[];
  selectedArtifactId: string | null;
  artifactViewport: ArtifactViewport;
  artifactRefreshing: boolean;
  artifactError: string | null;

  terminalSessions: TerminalSession[];
  activeTerminalSessionId: string;
  terminalRunning: boolean;
  terminalAutoScroll: boolean;

  images: PreviewImageItem[];
  selectedImageId: string | null;
  isRegeneratingImage: boolean;

  filesTree: FileTreeNode[];
  filesQuery: string;
  expandedDirs: string[];
  selectedPath: string | null;
  selectedPathSource: PreviewFileSelectionSource | null;

  setChangesFilter: (filter: ChangesFilter) => void;
  toggleChangeGroup: (group: "staged" | "unstaged") => void;
  toggleFileExpanded: (path: string) => void;
  toggleStage: (path: string) => void;
  revertChange: (path: string) => void;
  selectFile: (path: string, source: PreviewFileSelectionSource) => void;

  setArtifactViewport: (mode: ArtifactViewport) => void;
  selectArtifact: (id: string) => void;
  refreshArtifact: () => void;
  markArtifactUpdated: () => void;

  switchTerminalSession: (id: string) => void;
  addTerminalSession: () => void;
  closeTerminalSession: (id: string) => void;
  appendTerminalLine: (line: Omit<TerminalLine, "id">) => void;
  clearTerminalSession: (id: string) => void;
  stopTerminal: () => void;

  selectImage: (id: string) => void;
  regenerateImage: () => void;

  setFilesQuery: (query: string) => void;
  toggleDirExpanded: (path: string) => void;

  ingestMessage: (msg: Message) => void;
}

const initialTerminalLines: TerminalLine[] = [
  { id: "line-1", type: "cmd", text: "$ git status --porcelain" },
  { id: "line-2", type: "out", text: "M  src/api/billing.ts" },
  { id: "line-3", type: "out", text: "M  src/middleware/auth.ts" },
  { id: "line-4", type: "out", text: "?? prisma/migrations/20260206005516_add_billing/" },
  { id: "line-5", type: "cmd", text: "$ pnpm dev" },
  { id: "line-6", type: "out", text: "VITE v7.2.4 ready in 240 ms" },
];

const initialSessions: TerminalSession[] = [
  { id: "term-1", name: "Terminal 1", lines: initialTerminalLines },
  { id: "term-2", name: "Terminal 2", lines: [{ id: "line-7", type: "info", text: "Session idle" }] },
];

const initialArtifacts: ArtifactItem[] = [
  {
    id: "artifact-1",
    title: "Dashboard Preview",
    html: artifactHtml,
    status: "ready",
    updatedAt: new Date().toISOString(),
  },
];

const initialImages: PreviewImageItem[] = [
  {
    id: "img-1",
    prompt: "A futuristic AI desktop client interface with dark theme",
    model: "DALL-E 3",
    size: "1024x1024",
    url: imageOne,
    createdAt: new Date().toISOString(),
  },
  {
    id: "img-2",
    prompt: "Abstract neural network visualization with purple gradients",
    model: "DALL-E 3",
    size: "1024x1024",
    url: imageTwo,
    createdAt: new Date().toISOString(),
  },
];

const initialExpandedDirs = ["src", "src/api", "src/components", "src/middleware", "src/services", "prisma", "prisma/migrations"];

export const usePreviewStore = create<PreviewStore>((set, get) => ({
  allChanges: mockGitChanges,
  changesFilter: "all",
  collapsedGroups: { staged: false, unstaged: false },
  expandedFiles: mockGitChanges.slice(0, 1).map((change) => change.file),
  selectedFile: mockGitChanges[0]?.file || null,

  artifacts: initialArtifacts,
  selectedArtifactId: initialArtifacts[0]?.id || null,
  artifactViewport: "desktop",
  artifactRefreshing: false,
  artifactError: null,

  terminalSessions: initialSessions,
  activeTerminalSessionId: initialSessions[0].id,
  terminalRunning: true,
  terminalAutoScroll: true,

  images: initialImages,
  selectedImageId: initialImages[0]?.id || null,
  isRegeneratingImage: false,

  filesTree: mockFileTree,
  filesQuery: "",
  expandedDirs: initialExpandedDirs,
  selectedPath: mockGitChanges[0]?.file || null,
  selectedPathSource: "changes",

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
  toggleStage: (path) =>
    set((state) => ({
      allChanges: state.allChanges.map((change) =>
        change.file === path ? { ...change, staged: !change.staged } : change
      ),
    })),
  revertChange: (path) =>
    set((state) => ({
      allChanges: state.allChanges.filter((change) => change.file !== path),
      expandedFiles: state.expandedFiles.filter((file) => file !== path),
      selectedFile: state.selectedFile === path ? null : state.selectedFile,
    })),
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

  setArtifactViewport: (mode) => set({ artifactViewport: mode }),
  selectArtifact: (id) => set({ selectedArtifactId: id, artifactError: null }),
  refreshArtifact: () => {
    set({ artifactRefreshing: true, artifactError: null });
    window.setTimeout(() => {
      set((state) => ({
        artifactRefreshing: false,
        artifacts: state.artifacts.map((artifact) => ({
          ...artifact,
          status: artifact.id === state.selectedArtifactId ? "ready" : artifact.status,
          updatedAt:
            artifact.id === state.selectedArtifactId ? new Date().toISOString() : artifact.updatedAt,
        })),
      }));
    }, 700);
  },
  markArtifactUpdated: () =>
    set((state) => ({
      artifacts: state.artifacts.map((artifact) =>
        artifact.id === state.selectedArtifactId
          ? { ...artifact, updatedAt: new Date().toISOString() }
          : artifact
      ),
    })),

  switchTerminalSession: (id) => set({ activeTerminalSessionId: id }),
  addTerminalSession: () =>
    set((state) => {
      const index = state.terminalSessions.length + 1;
      const newSession: TerminalSession = {
        id: `term-${nanoid(6)}`,
        name: `Terminal ${index}`,
        lines: [{ id: `line-${nanoid(6)}`, type: "info", text: "New terminal session" }],
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
  stopTerminal: () => set({ terminalRunning: false }),

  selectImage: (id) => set({ selectedImageId: id }),
  regenerateImage: () => {
    set({ isRegeneratingImage: true });
    window.setTimeout(() => {
      const image: PreviewImageItem = {
        id: `img-${nanoid(6)}`,
        prompt: "Regenerated concept mock from latest prompt",
        model: "DALL-E 3",
        size: "1024x1024",
        url: imageTwo,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        isRegeneratingImage: false,
        images: [image, ...state.images],
        selectedImageId: image.id,
      }));
    }, 900);
  },

  setFilesQuery: (query) => set({ filesQuery: query }),
  toggleDirExpanded: (path) =>
    set((state) => ({
      expandedDirs: state.expandedDirs.includes(path)
        ? state.expandedDirs.filter((item) => item !== path)
        : [...state.expandedDirs, path],
    })),

  ingestMessage: (msg) => {
    const content = msg.content.toLowerCase();
    if (msg.role === "user") {
      get().appendTerminalLine({ type: "cmd", text: `$ agent run: ${msg.content.slice(0, 50)}` });
      get().appendTerminalLine({ type: "out", text: "Analyzing task context..." });
    }

    if (msg.role === "assistant") {
      get().appendTerminalLine({ type: "out", text: "Task output updated" });
      const touchesArtifact =
        content.includes("组件") ||
        content.includes("页面") ||
        content.includes("artifact") ||
        content.includes("preview");
      if (touchesArtifact) {
        get().markArtifactUpdated();
      }
    }
  },
}));
