import { Check, FileCode, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GitChange } from "@/types";
import { DiffView } from "./DiffView";

interface ChangeFileItemProps {
  change: GitChange;
  expanded: boolean;
  selected: boolean;
  onToggleExpand: () => void;
  onToggleStage: () => void;
  onRevert: () => void;
  onSelect: () => void;
}

export function ChangeFileItem({
  change,
  expanded,
  selected,
  onToggleExpand,
  onToggleStage,
  onRevert,
  onSelect,
}: ChangeFileItemProps) {
  return (
    <div className={cn("rounded-lg border overflow-hidden", selected ? "border-primary/60" : "border-border")}>
      <div className="flex items-center">
        <button
          onClick={() => {
            onToggleExpand();
            onSelect();
          }}
          className="flex-1 px-3 py-2 flex items-center gap-2 text-xs hover:bg-muted/30 transition-colors"
        >
          <FileCode
            size={13}
            className={cn(
              change.status === "added"
                ? "text-green-400"
                : change.status === "deleted"
                  ? "text-red-400"
                  : "text-yellow-400"
            )}
          />
          <span className="font-mono text-foreground truncate flex-1 text-left">{change.file}</span>
          <div className="flex items-center gap-2 shrink-0">
            {change.staged && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">staged</span>
            )}
            <span className="flex items-center gap-0.5 text-green-400 text-[11px]">
              <Plus size={10} />
              {change.additions}
            </span>
            <span className="flex items-center gap-0.5 text-red-400 text-[11px]">
              <Minus size={10} />
              {change.deletions}
            </span>
          </div>
        </button>

        <div className="pr-2 flex items-center gap-1">
          <button
            onClick={onToggleStage}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title={change.staged ? "Unstage" : "Stage"}
          >
            <Check size={12} />
          </button>
          <button
            onClick={onRevert}
            className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-muted/50 transition-colors"
            title="Revert (mock)"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-background/50">
          <DiffView diff={change.diff} />
        </div>
      )}
    </div>
  );
}
