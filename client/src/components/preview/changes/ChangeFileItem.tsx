import { Minus, Plus, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GitChange } from "@/types";

interface ChangeFileItemProps {
  change: GitChange;
  selected: boolean;
  onSelect: () => void;
  onToggleStage: () => void;
  onDiscard: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function getStatusDisplay(status: string): { letter: string; colorClass: string } {
  switch (status) {
    case "modified":  return { letter: "M", colorClass: "text-amber-400" };
    case "added":     return { letter: "A", colorClass: "text-green-400" };
    case "deleted":   return { letter: "D", colorClass: "text-red-400" };
    case "renamed":   return { letter: "R", colorClass: "text-blue-400" };
    case "untracked": return { letter: "U", colorClass: "text-green-500" };
    default:          return { letter: "?", colorClass: "text-muted-foreground" };
  }
}

function splitPath(filePath: string): { filename: string; dir: string } {
  const lastSlash = filePath.lastIndexOf("/");
  if (lastSlash === -1) return { filename: filePath, dir: "" };
  return {
    filename: filePath.slice(lastSlash + 1),
    dir: filePath.slice(0, lastSlash),
  };
}

export function ChangeFileItem({
  change,
  selected,
  onSelect,
  onToggleStage,
  onDiscard,
  onContextMenu,
}: ChangeFileItemProps) {
  const { letter, colorClass } = getStatusDisplay(change.status);
  const { filename, dir } = splitPath(change.file);

  return (
    <div
      className={cn(
        "group flex items-center h-[22px] pl-6 pr-2 cursor-pointer text-[12px]",
        selected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/40"
      )}
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
      }}
    >
      {/* Filename */}
      <span className="truncate text-foreground text-[13px]">{filename}</span>

      {/* Parent directory */}
      {dir && (
        <span className="ml-1.5 text-muted-foreground/60 truncate text-[11px] shrink-0">
          {dir}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-2" />

      {/* Hover actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleStage(); }}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title={change.staged ? "Unstage Changes" : "Stage Changes"}
        >
          {change.staged ? <Minus size={14} /> : <Plus size={14} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="p-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-muted/50 transition-colors"
          title="Discard Changes"
        >
          <Undo2 size={14} />
        </button>
      </div>

      {/* Status letter */}
      <span className={cn("w-5 text-center text-[11px] font-medium shrink-0 ml-1", colorClass)}>
        {letter}
      </span>
    </div>
  );
}
