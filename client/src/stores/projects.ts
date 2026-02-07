import { create } from "zustand";
import type { Project } from "@/types";
import {
  fetchProjects,
  addProject as apiAddProject,
  removeProject as apiRemoveProject,
  discoverProjects,
} from "@/lib/api/data";
import { useChatStore } from "./chat";

interface ProjectStore {
  projects: Project[];
  loading: boolean;
  loadProjects: () => Promise<void>;
  discover: () => Promise<void>;
  addProject: (path: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const projects = await fetchProjects();
      set({ projects });
    } catch {
      // Backend might be offline
    } finally {
      set({ loading: false });
    }
  },

  discover: async () => {
    set({ loading: true });
    try {
      const projects = await discoverProjects();
      set({ projects });
      // Reload threads since discover imports CLI sessions as threads
      await useChatStore.getState().loadThreads();
    } catch {
      // Discovery failed
    } finally {
      set({ loading: false });
    }
  },

  addProject: async (path) => {
    try {
      const project = await apiAddProject(path);
      set((s) => ({ projects: [...s.projects, project] }));
    } catch (error) {
      throw error;
    }
  },

  removeProject: async (id) => {
    try {
      await apiRemoveProject(id);
      set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
    } catch {
      // Failed to remove
    }
  },
}));
