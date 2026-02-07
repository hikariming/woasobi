import { create } from "zustand";
import type { PreviewTab } from "@/types";
import { getDefaultModelForMode } from "@/config/models";
import { checkHealth } from "@/lib/api/agent";

type SecondaryPanel = "skills" | "tools" | "automations" | null;

interface UIStore {
  sidebarOpen: boolean;
  secondaryPanel: SecondaryPanel;
  previewOpen: boolean;
  previewTab: PreviewTab;
  settingsOpen: boolean;
  activeModelId: string;
  activeMode: "claudeCode" | "codex" | "woAgent";
  backendConnected: boolean;
  cliStatus: { claude: boolean; codex: boolean } | null;
  toggleSidebar: () => void;
  setSecondaryPanel: (p: SecondaryPanel) => void;
  togglePreview: () => void;
  setPreviewTab: (t: PreviewTab) => void;
  setSettingsOpen: (o: boolean) => void;
  setActiveModelId: (id: string) => void;
  setActiveMode: (m: "claudeCode" | "codex" | "woAgent") => void;
  checkBackendHealth: () => Promise<void>;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  secondaryPanel: null,
  previewOpen: true,
  previewTab: "changes",
  settingsOpen: false,
  activeModelId: "claude-sonnet-4-5",
  activeMode: "claudeCode",
  backendConnected: false,
  cliStatus: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSecondaryPanel: (p) => set((s) => ({ secondaryPanel: s.secondaryPanel === p ? null : p })),
  togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
  setPreviewTab: (t) => set({ previewTab: t }),
  setSettingsOpen: (o) => set({ settingsOpen: o }),
  setActiveModelId: (id) => set({ activeModelId: id }),
  setActiveMode: (m) => set({
    activeMode: m,
    activeModelId: getDefaultModelForMode(m),
  }),
  checkBackendHealth: async () => {
    const health = await checkHealth();
    set({ backendConnected: health.ok, cliStatus: health.clis || null });
  },
}));
