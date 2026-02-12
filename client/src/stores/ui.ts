import { create } from "zustand";
import type { PreviewTab } from "@/types";
import { getDefaultModelForMode, getModelsForMode, type ModelOption } from "@/config/models";
import { checkHealth, fetchAvailableModels, fetchSlashCommands } from "@/lib/api/agent";
import { getDefaultPermissionMode, DEFAULT_CLAUDE_COMMANDS, CODEX_COMMANDS, type SlashCommand } from "@/config/commands";
import { useSettingsStore } from "./settings";

type SecondaryPanel = "skills" | "tools" | "automations" | null;

interface UIStore {
  sidebarOpen: boolean;
  secondaryPanel: SecondaryPanel;
  previewOpen: boolean;
  previewTab: PreviewTab;
  settingsOpen: boolean;
  activeModelId: string;
  activeMode: "claudeCode" | "codex" | "woAgent";
  availableModels: Record<"claudeCode" | "codex" | "woAgent", ModelOption[]>;
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
  loadModelsForMode: (mode: "claudeCode" | "codex" | "woAgent") => Promise<void>;
  loadSlashCommands: (provider: "claude" | "codex") => Promise<void>;
  checkBackendHealth: () => Promise<void>;
}

export const useUIStore = create<UIStore>((set, get) => ({
  sidebarOpen: true,
  secondaryPanel: null,
  previewOpen: true,
  previewTab: "changes",
  settingsOpen: false,
  activeModelId: "claude-sonnet-4-5",
  activeMode: "claudeCode",
  availableModels: {
    claudeCode: getModelsForMode("claudeCode"),
    codex: getModelsForMode("codex"),
    woAgent: [],
  },
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
  setActiveMode: (m) => {
    const list = get().availableModels[m];
    const settings = useSettingsStore.getState();
    const preferred =
      m === "codex"
        ? settings.activeCodexModel
        : m === "claudeCode"
          ? settings.activeClaudeModel
          : "";
    const resolved = list.some((model) => model.id === preferred)
      ? preferred
      : (list[0]?.id || getDefaultModelForMode(m));

    set({
      activeMode: m,
      activeModelId: resolved,
      permissionMode: getDefaultPermissionMode(m),
    });
  },
  setSlashCommands: (cmds) => set({ slashCommands: cmds }),
  setPermissionMode: (mode) => set({ permissionMode: mode }),
  loadModelsForMode: async (mode) => {
    const defaults = getModelsForMode(mode);
    set((s) => ({ availableModels: { ...s.availableModels, [mode]: defaults } }));

    if (mode !== "codex") return;

    const settings = useSettingsStore.getState();
    const fetched = await fetchAvailableModels("codex", {
      apiKey: settings.openaiApiKey || undefined,
      baseUrl: settings.openaiBaseUrl || undefined,
    });
    if (fetched.length === 0) return;

    set((s) => {
      const next = {
        ...s.availableModels,
        codex: fetched,
      };
      const currentMode = s.activeMode;
      const currentId = s.activeModelId;
      const exists = fetched.some((m) => m.id === currentId);

      if (currentMode === "codex" && !exists) {
        const fallbackId = fetched[0].id;
        useSettingsStore.getState().setActiveCodexModel(fallbackId);
        return {
          availableModels: next,
          activeModelId: fallbackId,
        };
      }

      return { availableModels: next };
    });
  },
  loadSlashCommands: async (provider) => {
    // Set local defaults immediately so the dropdown is never empty
    const defaults = provider === 'codex' ? CODEX_COMMANDS : DEFAULT_CLAUDE_COMMANDS;
    set({ slashCommands: defaults });
    // Then try to get live commands from API (may include extra commands from the session)
    try {
      const cmds = await fetchSlashCommands(provider);
      if (cmds.length > 0) {
        set({ slashCommands: cmds });
      }
    } catch {
      // Keep defaults
    }
  },
  checkBackendHealth: async () => {
    const health = await checkHealth();
    set({ backendConnected: health.ok, cliStatus: health.clis || null });
  },
}));
