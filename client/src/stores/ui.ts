import { create } from "zustand";
import type { PreviewTab } from "@/types";
import { getDefaultModelForMode } from "@/config/models";
import { checkHealth, fetchSlashCommands } from "@/lib/api/agent";
import { getDefaultPermissionMode, type SlashCommand } from "@/config/commands";

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
  slashCommands: SlashCommand[];
  permissionMode: string;
  toggleSidebar: () => void;
  setSecondaryPanel: (p: SecondaryPanel) => void;
  togglePreview: () => void;
  setPreviewTab: (t: PreviewTab) => void;
  setSettingsOpen: (o: boolean) => void;
  setActiveModelId: (id: string) => void;
  setActiveMode: (m: "claudeCode" | "codex" | "woAgent") => void;
  setSlashCommands: (cmds: SlashCommand[]) => void;
  setPermissionMode: (mode: string) => void;
  loadSlashCommands: (provider: "claude" | "codex") => Promise<void>;
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
  slashCommands: [],
  permissionMode: "bypassPermissions",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSecondaryPanel: (p) => set((s) => ({ secondaryPanel: s.secondaryPanel === p ? null : p })),
  togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
  setPreviewTab: (t) => set({ previewTab: t }),
  setSettingsOpen: (o) => set({ settingsOpen: o }),
  setActiveModelId: (id) => set({ activeModelId: id }),
  setActiveMode: (m) => set({
    activeMode: m,
    activeModelId: getDefaultModelForMode(m),
    permissionMode: getDefaultPermissionMode(m),
  }),
  setSlashCommands: (cmds) => set({ slashCommands: cmds }),
  setPermissionMode: (mode) => set({ permissionMode: mode }),
  loadSlashCommands: async (provider) => {
    const cmds = await fetchSlashCommands(provider);
    if (cmds.length > 0) {
      set({ slashCommands: cmds });
    }
  },
  checkBackendHealth: async () => {
    const health = await checkHealth();
    set({ backendConnected: health.ok, cliStatus: health.clis || null });
  },
}));
