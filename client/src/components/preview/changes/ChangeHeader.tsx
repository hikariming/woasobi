import { MoreHorizontal, RefreshCw } from "lucide-react";

interface ChangeHeaderProps {
  loading?: boolean;
  onRefresh?: () => void;
}

export function ChangeHeader({ loading, onRefresh }: ChangeHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 h-[35px] shrink-0 border-b border-border">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Source Control
      </span>
      <div className="flex items-center gap-0.5">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        )}
        <button
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="More Actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}
