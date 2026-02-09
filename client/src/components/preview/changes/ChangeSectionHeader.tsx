import { ChevronDown, ChevronRight, Minus, Plus, Undo2 } from "lucide-react";

interface ChangeSectionHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  type: "staged" | "unstaged";
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onDiscardAll?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function ChangeSectionHeader({
  label,
  count,
  collapsed,
  onToggle,
  type,
  onStageAll,
  onUnstageAll,
  onDiscardAll,
  onContextMenu,
}: ChangeSectionHeaderProps) {
  return (
    <div
      className="group flex items-center h-[22px] px-2 hover:bg-muted/30"
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e);
        }
      }}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-1 flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        <span className="truncate">{label}</span>
        <span className="text-[10px] font-normal text-muted-foreground ml-0.5">{count}</span>
      </button>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {type === "unstaged" && onStageAll && (
          <button
            onClick={(e) => { e.stopPropagation(); onStageAll(); }}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Stage All Changes"
          >
            <Plus size={16} />
          </button>
        )}
        {type === "staged" && onUnstageAll && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnstageAll(); }}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Unstage All Changes"
          >
            <Minus size={16} />
          </button>
        )}
        {onDiscardAll && (
          <button
            onClick={(e) => { e.stopPropagation(); onDiscardAll(); }}
            className="p-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-muted/50 transition-colors"
            title="Discard All Changes"
          >
            <Undo2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
