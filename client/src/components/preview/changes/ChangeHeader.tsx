import { ArrowDown, ArrowUp, Loader2, MoreHorizontal, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangeHeaderProps {
  loading?: boolean;
  onRefresh?: () => void;
  currentBranch?: string;
  aheadCount?: number;
  behindCount?: number;
  syncLoading?: boolean;
  onSync?: () => void;
}

export function ChangeHeader({
  loading,
  onRefresh,
  currentBranch,
  aheadCount = 0,
  behindCount = 0,
  syncLoading,
  onSync,
}: ChangeHeaderProps) {
  const hasSync = aheadCount > 0 || behindCount > 0;

  return (
    <div className="flex items-center justify-between px-3 h-[35px] shrink-0 border-b border-border">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Source Control
      </span>
      <div className="flex items-center gap-0.5">
        {/* Sync button — shows when there are commits to push/pull */}
        {onSync && (hasSync || syncLoading) && (
          <button
            onClick={onSync}
            disabled={syncLoading}
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-medium transition-colors",
              syncLoading
                ? "text-muted-foreground cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            title={
              aheadCount > 0 && behindCount > 0
                ? `Sync: ${aheadCount} to push, ${behindCount} to pull`
                : aheadCount > 0
                  ? `Push ${aheadCount} commit${aheadCount > 1 ? "s" : ""}`
                  : `Pull ${behindCount} commit${behindCount > 1 ? "s" : ""}`
            }
          >
            {syncLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <>
                {behindCount > 0 && (
                  <span className="flex items-center">
                    <ArrowDown size={12} />
                    {behindCount}
                  </span>
                )}
                {aheadCount > 0 && (
                  <span className="flex items-center">
                    <ArrowUp size={12} />
                    {aheadCount}
                  </span>
                )}
              </>
            )}
          </button>
        )}
        {/* Branch name */}
        {currentBranch && (
          <span className="text-[11px] text-muted-foreground/70 px-1 truncate max-w-[80px]">
            {currentBranch}
          </span>
        )}
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
