import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Plus, Zap, Wrench, Puzzle, Settings, Search,
  Loader2, FolderSearch, FolderPlus, Trash2, Pin, PinOff,
} from "lucide-react";
import { useChatStore, useUIStore, useProjectStore } from "@/stores";
import { ProjectGroup } from "./ProjectGroup";
import { SecondaryPanel } from "./SecondaryPanel";

export function Sidebar() {
  const {
    threads,
    activeThreadId,
    threadRuntimeStatus,
    setActiveThread,
    createThread,
    deleteThread,
    clearProjectThreads,
  } = useChatStore();
  const { secondaryPanel, setSecondaryPanel, setSettingsOpen } = useUIStore();
  const { projects, loading: projectsLoading, discover, addProject, removeProject, togglePin } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{ type: "thread" | "project"; id: string; x: number; y: number } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Sort projects: pinned first, then original order
  const sortedProjects = [...projects].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  // Group threads by project (show all projects, even empty ones)
  const grouped = sortedProjects.map((project) => ({
    project,
    items: threads
      .filter((t) => t.projectId === project.id)
      .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase())),
  }));

  // Threads without a matching project (orphans)
  const orphanThreads = threads
    .filter((t) => !projects.some((p) => p.id === t.projectId))
    .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const defaultProject = projects[0];

  if (secondaryPanel) {
    return <SecondaryPanel type={secondaryPanel} onBack={() => setSecondaryPanel(null)} />;
  }

  const handlePickProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select project folder",
      });
      if (typeof selected === "string" && selected.trim()) {
        await addProject(selected.trim());
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="text-sm font-semibold tracking-tight">WoaSobi</span>
      </div>

      {/* New Thread */}
      <div className="px-3 pb-2">
        <button
          onClick={() => defaultProject && createThread(defaultProject.id)}
          disabled={!defaultProject}
          className="bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
        >
          <Plus className="size-4" />
          New Thread
        </button>
      </div>

      {/* Quick Actions */}
      <div className="border-border space-y-0.5 border-b px-3 pb-2">
        {[
          { icon: Zap, label: "Automations", key: "automations" as const },
          { icon: Wrench, label: "Skills", key: "skills" as const },
          { icon: Puzzle, label: "Tools", key: "tools" as const },
        ].map((a) => (
          <button
            key={a.key}
            onClick={() => setSecondaryPanel(a.key)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
          >
            <a.icon className="size-4" />
            {a.label}
          </button>
        ))}
      </div>

      {/* Projects header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-muted-foreground text-xs font-medium">Projects</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => discover()}
            title="Discover projects from Claude Code & Codex"
            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
          >
            <FolderSearch className="size-3.5" />
          </button>
          <button
            onClick={handlePickProject}
            title="Add project"
            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {projectsLoading && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Threads header + search */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-muted-foreground text-xs font-medium">Threads</span>
        <Search className="text-muted-foreground size-3.5" />
      </div>

      <div className="px-3 pb-1">
        <input
          type="text"
          placeholder="Search threads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-border bg-muted/50 focus:border-primary/50 w-full rounded-md border px-2 py-1 text-xs outline-none"
        />
      </div>

      {/* Thread list grouped by project */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-1.5">
        {grouped.map(({ project, items }) => (
          <ProjectGroup
            key={project.id}
            project={project}
            threads={items}
            activeId={activeThreadId}
            threadRuntimeStatus={threadRuntimeStatus}
            onSelect={(id) => setActiveThread(id)}
            onNewThread={(pid) => createThread(pid)}
            onContextMenu={(e, type, id) => {
              e.preventDefault();
              setContextMenu({ type, id, x: e.clientX, y: e.clientY });
            }}
          />
        ))}
        {orphanThreads.length > 0 && (
          <ProjectGroup
            project={{ id: "__orphan", name: "Other", path: "", source: "manual", addedAt: "" }}
            threads={orphanThreads}
            activeId={activeThreadId}
            threadRuntimeStatus={threadRuntimeStatus}
            onSelect={(id) => setActiveThread(id)}
            onNewThread={() => {}}
            onContextMenu={(e, type, id) => {
              e.preventDefault();
              setContextMenu({ type, id, x: e.clientX, y: e.clientY });
            }}
          />
        )}
        {projects.length === 0 && !projectsLoading && (
          <div className="text-muted-foreground py-4 text-center text-xs">
            No projects yet.
            <br />
            <button onClick={() => discover()} className="text-primary mt-1 hover:underline">
              Discover from CLI
            </button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === "thread" && (
            <button
              onClick={() => {
                deleteThread(contextMenu.id);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-accent"
            >
              <Trash2 className="size-3" /> Delete
            </button>
          )}
          {contextMenu.type === "project" &&
            (() => {
              const proj = projects.find((p) => p.id === contextMenu.id);
              const isPinned = proj?.pinned;
              const hasThreads = threads.some((t) => t.projectId === contextMenu.id);
              return (
                <>
                  <button
                    onClick={() => {
                      togglePin(contextMenu.id);
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-accent"
                  >
                    {isPinned ? <PinOff className="size-3" /> : <Pin className="size-3" />}
                    {isPinned ? "Unpin" : "Pin to Top"}
                  </button>
                  {hasThreads && (
                    <button
                      onClick={() => {
                        clearProjectThreads(contextMenu.id);
                        setContextMenu(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-accent"
                    >
                      <Trash2 className="size-3" /> Clear All Threads
                    </button>
                  )}
                  <button
                    onClick={() => {
                      removeProject(contextMenu.id);
                      setContextMenu(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-accent"
                  >
                    <Trash2 className="size-3" /> Remove
                  </button>
                </>
              );
            })()}
        </div>
      )}

      {/* Footer */}
      <div className="border-border flex items-center border-t p-3">
        <button
          onClick={() => setSettingsOpen(true)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
        >
          <Settings className="size-4" /> Settings
        </button>
      </div>
    </div>
  );
}
