import { useState } from "react";
import { ChevronDown, ChevronRight, GitCommit, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewStore } from "@/stores/preview";
import { useUIStore } from "@/stores/ui";
import { ChangeFileItem } from "./changes/ChangeFileItem";
import { ChangeHeader } from "./changes/ChangeHeader";

export function CodeChangesTab() {
  const {
    allChanges,
    changesFilter,
    changesLoading,
    commitMessage,
    commitLoading,
    collapsedGroups,
    expandedFiles,
    selectedFile,
    setChangesFilter,
    toggleChangeGroup,
    toggleFileExpanded,
    toggleStage,
    revertChange,
    selectFile,
    setCommitMessage,
    commitStaged,
  } = usePreviewStore();
  const { togglePreview } = useUIStore();
  const [commitError, setCommitError] = useState<string | null>(null);

  const filteredChanges = allChanges.filter((change) => {
    if (changesFilter === "staged") return change.staged;
    if (changesFilter === "unstaged") return !change.staged;
    return true;
  });

  const unstaged = filteredChanges.filter((change) => !change.staged);
  const staged = filteredChanges.filter((change) => change.staged);
  const allStaged = allChanges.filter((c) => c.staged);

  if (changesLoading && allChanges.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredChanges.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <p className="text-sm font-medium text-foreground">No changes detected</p>
        <p className="text-xs text-muted-foreground mt-1">Git changes will appear here when files are modified.</p>
        <button
          onClick={togglePreview}
          className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
        >
          <MessageSquare size={12} />
          Back to Chat
        </button>
      </div>
    );
  }

  const handleCommit = async () => {
    setCommitError(null);
    const result = await commitStaged();
    if (!result.ok && result.error) {
      setCommitError(result.error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <ChangeHeader filter={changesFilter} count={filteredChanges.length} onFilter={setChangesFilter} />

        <section className="space-y-2">
          <button
            onClick={() => toggleChangeGroup("unstaged")}
            className="w-full flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {collapsedGroups.unstaged ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            Unstaged ({unstaged.length})
          </button>
          {!collapsedGroups.unstaged && (
            <div className="space-y-2">
              {unstaged.map((change) => (
                <ChangeFileItem
                  key={change.file}
                  change={change}
                  expanded={expandedFiles.includes(change.file)}
                  selected={selectedFile === change.file}
                  onToggleExpand={() => toggleFileExpanded(change.file)}
                  onToggleStage={() => toggleStage(change.file)}
                  onRevert={() => revertChange(change.file)}
                  onSelect={() => selectFile(change.file, "changes")}
                />
              ))}
              {unstaged.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No unstaged changes
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <button
            onClick={() => toggleChangeGroup("staged")}
            className="w-full flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {collapsedGroups.staged ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            Staged ({staged.length})
          </button>
          {!collapsedGroups.staged && (
            <div className="space-y-2">
              {staged.map((change) => (
                <ChangeFileItem
                  key={change.file}
                  change={change}
                  expanded={expandedFiles.includes(change.file)}
                  selected={selectedFile === change.file}
                  onToggleExpand={() => toggleFileExpanded(change.file)}
                  onToggleStage={() => toggleStage(change.file)}
                  onRevert={() => revertChange(change.file)}
                  onSelect={() => selectFile(change.file, "changes")}
                />
              ))}
              {staged.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No staged changes
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Commit Section */}
      {allStaged.length > 0 && (
        <div className="border-t border-border p-3 space-y-2 shrink-0">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && commitMessage.trim()) {
                handleCommit();
              }
            }}
            placeholder="Commit message..."
            rows={2}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs outline-none focus:border-primary resize-none"
          />
          {commitError && (
            <div className="text-[10px] text-red-400 truncate">{commitError}</div>
          )}
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || commitLoading}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              commitMessage.trim() && !commitLoading
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {commitLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <GitCommit size={12} />
            )}
            Commit {allStaged.length} file{allStaged.length !== 1 ? "s" : ""}
          </button>
        </div>
      )}
    </div>
  );
}
