import { create } from "zustand";
import type { PreviewTab } from "@/types";

type SecondaryPanel = "skills" | "tools" | "automations" | null;

interface UIStore {
  sidebarOpen: boolean;
  secondaryPanel: SecondaryPanel;
  previewOpen: boolean;
  previewTab: PreviewTab;
  settingsOpen: boolean;
  activeModelId: string;
  activeMode: "claudeCode" | "codex" | "woAgent";
  toggleSidebar: () => void;
  setSecondaryPanel: (p: SecondaryPanel) => void;
  togglePreview: () => void;
  setPreviewTab: (t: PreviewTab) => void;
  setSettingsOpen: (o: boolean) => void;
  setActiveModelId: (id: string) => void;
  setActiveMode: (m: "claudeCode" | "codex" | "woAgent") => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  secondaryPanel: null,
  previewOpen: true,
  previewTab: "changes",
  settingsOpen: false,
  activeModelId: "gpt-5.3-codex",
  activeMode: "claudeCode",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSecondaryPanel: (p) => set((s) => ({ secondaryPanel: s.secondaryPanel === p ? null : p })),
  togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
  setPreviewTab: (t) => set({ previewTab: t }),
  setSettingsOpen: (o) => set({ settingsOpen: o }),
  setActiveModelId: (id) => set({ activeModelId: id }),
  setActiveMode: (m) => set({ activeMode: m }),
}));
