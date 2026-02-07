import { cn } from "@/lib/utils";
import type { Thread } from "@/types";
import type { ThreadRuntimeStatus } from "@/stores/chat";
import { ThreadStatusIndicator } from "./ThreadStatusIndicator";

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return `${Math.floor(diff / 604_800_000)}w`;
}

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  status: ThreadRuntimeStatus | undefined;
  onSelect: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, type: "thread" | "project", id: string) => void;
}

export function ThreadItem({ thread, isActive, status, onSelect, onContextMenu }: ThreadItemProps) {
  return (
    <button
      onClick={() => onSelect(thread.id)}
      onContextMenu={(e) => onContextMenu(e, "thread", thread.id)}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <span className="truncate pr-2">{thread.title}</span>
      <span className="flex items-center gap-1 shrink-0">
        {status && <ThreadStatusIndicator status={status} />}
        {thread.sourcePath && (
          <span className="text-[9px] text-muted-foreground/50">
            {thread.mode === "codex" ? "CX" : "CC"}
          </span>
        )}
        <span className="text-muted-foreground text-[10px]">
          {formatRelativeTime(thread.updatedAt)}
        </span>
      </span>
    </button>
  );
}
