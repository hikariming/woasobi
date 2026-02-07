import { useState, useEffect } from "react";
import {
  Plus, Zap, Wrench, Puzzle, Settings, Search,
  ChevronDown, ArrowLeft, FolderOpen, Trash2,
  FileCode, Bug, RefreshCw, FlaskConical, FileText,
  Image, Globe, Terminal, GitBranch, Plug, Loader2,
  FolderSearch, FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore, useUIStore, useProjectStore } from "@/stores";
import { mockSkills } from "@/mocks/skills";
import { mockTools } from "@/mocks/tools";
import type { Project, Thread } from "@/types";

const skillIconMap: Record<string, React.ElementType> = {
  FileCode, Search, Bug, RefreshCw, FlaskConical, FileText, Image, Globe,
};
const toolIconMap: Record<string, React.ElementType> = {
  Terminal, FolderOpen, GitBranch, Plug,
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return `${Math.floor(diff / 604_800_000)}w`;
}

export function Sidebar() {
  const { threads, activeThreadId, setActiveThread, createThread, deleteThread } = useChatStore();
  const { secondaryPanel, setSecondaryPanel, setSettingsOpen } = useUIStore();
  const { projects, loading: projectsLoading, discover, addProject, removeProject } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectPath, setNewProjectPath] = useState("");
  const [contextMenu, setContextMenu] = useState<{ type: "thread" | "project"; id: string; x: number; y: number } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Group threads by project (show all projects, even empty ones)
  const grouped = projects.map((project) => ({
    project,
    items: threads
      .filter((t) => t.projectId === project.id)
      .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase())),
  }));

  // Threads without a matching project (orphans)
  const orphanThreads = threads
    .filter((t) => !projects.some((p) => p.id === t.projectId))
    .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // Find the first project to use as default for new threads
  const defaultProject = projects[0];

  if (secondaryPanel) {
    return <SecondaryPanel type={secondaryPanel} onBack={() => setSecondaryPanel(null)} />;
  }

  const handleAddProject = async () => {
    if (!newProjectPath.trim()) return;
    try {
      await addProject(newProjectPath.trim());
      setNewProjectPath("");
      setAddingProject(false);
    } catch {
      // Show error?
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
            onClick={() => setAddingProject(!addingProject)}
            title="Add project"
            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Add project input */}
      {addingProject && (
        <div className="px-3 pb-1 flex gap-1">
          <input
            type="text"
            placeholder="/path/to/project"
            value={newProjectPath}
            onChange={(e) => setNewProjectPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
            className="border-border bg-muted/50 focus:border-primary/50 flex-1 rounded-md border px-2 py-1 text-xs outline-none"
            autoFocus
          />
          <button
            onClick={handleAddProject}
            className="text-primary text-xs px-1.5 hover:underline"
          >
            Add
          </button>
        </div>
      )}

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
            <button
              onClick={() => discover()}
              className="text-primary mt-1 hover:underline"
            >
              Discover from CLI
            </button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[120px] rounded-md border border-border bg-popover p-1 shadow-md"
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
          {contextMenu.type === "project" && (
            <button
              onClick={() => {
                removeProject(contextMenu.id);
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-accent"
            >
              <Trash2 className="size-3" /> Remove
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-border flex items-center justify-between border-t p-3">
        <button onClick={() => setSettingsOpen(true)} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
          <Settings className="size-4" /> Settings
        </button>
        <button className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium">Upgrade</button>
      </div>
    </div>
  );
}

function ProjectGroup({ project, threads, activeId, onSelect, onContextMenu, onNewThread }: {
  project: Project;
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, type: "thread" | "project", id: string) => void;
  onNewThread: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <div className="flex items-center">
        <button
          onClick={() => setOpen(!open)}
          onContextMenu={(e) => project.id !== "__orphan" && onContextMenu(e, "project", project.id)}
          className="text-muted-foreground hover:text-foreground flex flex-1 items-center gap-1.5 px-1.5 py-1 text-xs font-medium"
        >
          <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
          <FolderOpen className="size-3" />
          <span className="truncate">{project.name}</span>
          {project.source && project.source !== "manual" && (
            <span className="ml-1 text-[9px] text-muted-foreground/60">
              {project.source === 'claude+codex' ? 'CC+CX' : project.source === 'claude' ? 'CC' : 'CX'}
            </span>
          )}
        </button>
        {project.id !== "__orphan" && (
          <button
            onClick={() => onNewThread(project.id)}
            title="New thread in this project"
            className="text-muted-foreground hover:text-foreground p-0.5 mr-1 rounded opacity-0 group-hover:opacity-100 hover:!opacity-100"
            style={{ opacity: undefined }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
          >
            <Plus className="size-3" />
          </button>
        )}
      </div>
      {open && (
        <div className="ml-2 space-y-0.5">
          {threads.length === 0 && (
            <div className="text-muted-foreground/50 px-2 py-1 text-[10px] italic">No threads</div>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              onContextMenu={(e) => onContextMenu(e, "thread", t.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                t.id === activeId ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <span className="truncate pr-2">{t.title}</span>
              <span className="flex items-center gap-1 shrink-0">
                {t.sourcePath && (
                  <span className="text-[9px] text-muted-foreground/50">
                    {t.mode === 'codex' ? 'CX' : 'CC'}
                  </span>
                )}
                <span className="text-muted-foreground text-[10px]">
                  {formatRelativeTime(t.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SecondaryPanel({ type, onBack }: { type: "skills" | "tools" | "automations"; onBack: () => void }) {
  const title = type === "skills" ? "Skills" : type === "tools" ? "Tools" : "Automations";
  const list = type === "skills" ? mockSkills : type === "tools" ? mockTools : [];
  const iconMap = type === "skills" ? skillIconMap : toolIconMap;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-2 border-b p-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /></button>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-3 pb-2">
        <input type="text" placeholder={`Search ${type}...`} className="border-border bg-muted/50 w-full rounded-md border px-2 py-1.5 text-xs outline-none" />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3">
        {list.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-xs">
            No {type} configured yet.
            <br />
            <button className="text-primary mt-2 hover:underline">+ Create</button>
          </div>
        ) : (
          list.map((item) => {
            const Icon = iconMap[item.icon] || Puzzle;
            return (
              <button key={item.id} className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors">
                <Icon className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-foreground text-sm">{item.name}</div>
                  <div className="text-muted-foreground truncate text-xs">{item.description}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="border-border border-t p-3">
        <button className="text-primary flex items-center gap-1 text-sm hover:underline">
          <Plus className="size-3.5" /> {type === "skills" ? "Create Custom Skill" : type === "tools" ? "Add MCP Tool" : "Create Automation"}
        </button>
      </div>
    </div>
  );
}
