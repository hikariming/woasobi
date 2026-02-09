import { useState } from "react";
import { ChevronDown, FolderOpen, SquarePen, Ellipsis, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, Thread } from "@/types";
import type { ThreadRuntimeStatus } from "@/stores/chat";
import { ThreadItem } from "./ThreadItem";

interface ProjectGroupProps {
  project: Project;
  threads: Thread[];
  activeId: string | null;
  threadRuntimeStatus: Record<string, ThreadRuntimeStatus>;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, type: "thread" | "project", id: string) => void;
  onNewThread: (projectId: string) => void;
}

export function ProjectGroup({
  project,
  threads,
  activeId,
  threadRuntimeStatus,
  onSelect,
  onContextMenu,
  onNewThread,
}: ProjectGroupProps) {
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState(false);

  // Check if any thread in this group has a running/permission status
  const hasActiveThread = threads.some((t) => {
    const s = threadRuntimeStatus[t.id];
    return s === "running" || s === "awaiting-permission";
  });

  return (
    <div className="mb-1" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="flex items-center">
        <button
          onClick={() => setOpen(!open)}
          onContextMenu={(e) => project.id !== "__orphan" && onContextMenu(e, "project", project.id)}
          className="text-muted-foreground hover:text-foreground flex flex-1 items-center gap-1.5 px-1.5 py-1 text-xs font-medium min-w-0"
        >
          <ChevronDown className={cn("size-3 shrink-0 transition-transform", !open && "-rotate-90")} />
          <FolderOpen className="size-3 shrink-0" />
          <span className="truncate">{project.name}</span>
          {project.pinned && <Pin className="size-2.5 text-primary shrink-0" />}
          {project.source && project.source !== "manual" && (
            <span className="ml-1 text-[9px] text-muted-foreground/60 shrink-0">
              {project.source === "claude+codex" ? "CC+CX" : project.source === "claude" ? "CC" : "CX"}
            </span>
          )}
          {/* Collapsed but has active thread — show a tiny dot hint */}
          {!open && hasActiveThread && (
            <span className="ml-auto size-1.5 rounded-full bg-sky-400 shrink-0" />
          )}
        </button>
        {project.id !== "__orphan" && (
          <div className={cn("flex items-center gap-0.5 mr-1 shrink-0 transition-opacity", hovered ? "opacity-100" : "opacity-0")}>
            <button
              onClick={() => onNewThread(project.id)}
              title="New thread"
              className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-accent"
            >
              <SquarePen className="size-3" />
            </button>
            <button
              onClick={(e) => onContextMenu(e, "project", project.id)}
              title="More actions"
              className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-accent"
            >
              <Ellipsis className="size-3" />
            </button>
          </div>
        )}
      </div>
      {open && (
        <div className="ml-2 space-y-0.5">
          {threads.length === 0 && (
            <div className="text-muted-foreground/50 px-2 py-1 text-[10px] italic">No threads</div>
          )}
          {threads.map((t) => (
            <ThreadItem
              key={t.id}
              thread={t}
              isActive={t.id === activeId}
              status={threadRuntimeStatus[t.id]}
              onSelect={onSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
