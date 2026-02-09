import { useState, useEffect, useCallback } from "react";
import {
  Check, Clipboard, Copy, FileText, Loader2,
  Minus, Plus, Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewStore } from "@/stores/preview";
import { ChangeFileItem } from "./changes/ChangeFileItem";
import { ChangeHeader } from "./changes/ChangeHeader";
import { ChangeSectionHeader } from "./changes/ChangeSectionHeader";
import { ConfirmDialog } from "./changes/ConfirmDialog";
import { DiffView } from "./changes/DiffView";

const GIT_POLL_INTERVAL = 3000;

type ContextMenuState = {
  x: number;
  y: number;
} & (
  | { type: "file"; file: string; staged: boolean }
  | { type: "section"; section: "staged" | "unstaged" }
);

export function CodeChangesTab() {
  const {
    allChanges,
    changesLoading,
    commitMessage,
    commitLoading,
    collapsedGroups,
    selectedFile,
    activeProjectId,
    activeProjectPath,
    currentBranch,
    aheadCount,
    behindCount,
    syncLoading,
    toggleChangeGroup,
    toggleStage,
    discardChange,
    selectFile,
    setCommitMessage,
    commitStaged,
    commitAll,
    loadGitStatus,
    loadSyncStatus,
    syncPush,
    syncPull,
    stageAll,
    unstageAll,
    discardAll,
  } = usePreviewStore();

  const [commitError, setCommitError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Close context menu on any click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Poll git status + sync status
  useEffect(() => {
    if (!activeProjectId) return;
    const timer = setInterval(() => {
      loadGitStatus(activeProjectId);
      loadSyncStatus(activeProjectId);
    }, GIT_POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [activeProjectId, loadGitStatus, loadSyncStatus]);

  const staged = allChanges.filter((c) => c.staged);
  const unstaged = allChanges.filter((c) => !c.staged);
  const selectedChange = allChanges.find((c) => c.file === selectedFile);

  const hasStaged = staged.length > 0;
  const hasChanges = allChanges.length > 0;

  const handleCommit = async () => {
    setCommitError(null);
    // If staged files exist, commit staged only; otherwise stage all and commit (VS Code behavior)
    const result = hasStaged ? await commitStaged() : await commitAll();
    if (!result.ok && result.error) {
      setCommitError(result.error);
    }
  };

  const handleSync = async () => {
    setCommitError(null);
    // Pull first if behind, then push if ahead (like VS Code sync)
    if (behindCount > 0) {
      const pullResult = await syncPull();
      if (!pullResult.ok && pullResult.error) {
        setCommitError(pullResult.error);
        return;
      }
    }
    if (aheadCount > 0 || behindCount === 0) {
      const pushResult = await syncPush();
      if (!pushResult.ok && pushResult.error) {
        setCommitError(pushResult.error);
      }
    }
  };

  const confirmDiscardFile = useCallback((path: string) => {
    const filename = path.split("/").pop() || path;
    setConfirmDialog({
      open: true,
      title: "Discard Changes",
      description: `Are you sure you want to discard changes in "${filename}"? This cannot be undone.`,
      onConfirm: () => discardChange(path),
    });
  }, [discardChange]);

  const confirmDiscardAll = useCallback(() => {
    setConfirmDialog({
      open: true,
      title: "Discard All Changes",
      description: `Are you sure you want to discard all ${unstaged.length} change(s)? This cannot be undone.`,
      onConfirm: () => discardAll(),
    });
  }, [unstaged.length, discardAll]);

  // Context menu helpers
  const openFileContextMenu = useCallback((e: React.MouseEvent, file: string, isStaged: boolean) => {
    setContextMenu({ type: "file", file, staged: isStaged, x: e.clientX, y: e.clientY });
  }, []);

  const openSectionContextMenu = useCallback((e: React.MouseEvent, section: "staged" | "unstaged") => {
    setContextMenu({ type: "section", section, x: e.clientX, y: e.clientY });
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setContextMenu(null);
  }, []);

  if (changesLoading && allChanges.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <ChangeHeader
        loading={changesLoading}
        onRefresh={() => activeProjectId && loadGitStatus(activeProjectId)}
        currentBranch={currentBranch}
        aheadCount={aheadCount}
        behindCount={behindCount}
        syncLoading={syncLoading}
        onSync={handleSync}
      />

      {/* Commit Section - always visible */}
      <div className="px-3 py-2 space-y-1.5 shrink-0 border-b border-border">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && commitMessage.trim() && hasChanges) {
              handleCommit();
            }
          }}
          placeholder="Message (Ctrl+Enter to commit)"
          rows={1}
          className="w-full rounded-sm border border-border bg-muted/30 px-2 py-1 text-xs outline-none focus:border-primary resize-none"
        />
        {commitError && (
          <div className="text-[10px] text-red-400 truncate">{commitError}</div>
        )}
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim() || commitLoading || !hasChanges}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium transition-colors",
            commitMessage.trim() && !commitLoading && hasChanges
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {commitLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          {hasStaged ? "Commit" : "Commit All"}
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Empty state */}
        {allChanges.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-muted-foreground">No changes detected</p>
          </div>
        )}

        {/* Staged Changes */}
        {staged.length > 0 && (
          <div className="py-0.5">
            <ChangeSectionHeader
              label="Staged Changes"
              count={staged.length}
              collapsed={collapsedGroups.staged}
              onToggle={() => toggleChangeGroup("staged")}
              type="staged"
              onUnstageAll={unstageAll}
              onContextMenu={(e) => openSectionContextMenu(e, "staged")}
            />
            {!collapsedGroups.staged &&
              staged.map((change) => (
                <ChangeFileItem
                  key={`staged-${change.file}`}
                  change={change}
                  selected={selectedFile === change.file}
                  onSelect={() => selectFile(change.file, "changes")}
                  onToggleStage={() => toggleStage(change.file)}
                  onDiscard={() => confirmDiscardFile(change.file)}
                  onContextMenu={(e) => openFileContextMenu(e, change.file, true)}
                />
              ))}
          </div>
        )}

        {/* Changes (unstaged) */}
        {unstaged.length > 0 && (
          <div className="py-0.5">
            <ChangeSectionHeader
              label="Changes"
              count={unstaged.length}
              collapsed={collapsedGroups.unstaged}
              onToggle={() => toggleChangeGroup("unstaged")}
              type="unstaged"
              onStageAll={stageAll}
              onDiscardAll={confirmDiscardAll}
              onContextMenu={(e) => openSectionContextMenu(e, "unstaged")}
            />
            {!collapsedGroups.unstaged &&
              unstaged.map((change) => (
                <ChangeFileItem
                  key={`unstaged-${change.file}`}
                  change={change}
                  selected={selectedFile === change.file}
                  onSelect={() => selectFile(change.file, "changes")}
                  onToggleStage={() => toggleStage(change.file)}
                  onDiscard={() => confirmDiscardFile(change.file)}
                  onContextMenu={(e) => openFileContextMenu(e, change.file, false)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Diff View for selected file */}
      {selectedChange && (
        <div className="border-t border-border shrink-0 max-h-[40%] overflow-y-auto">
          <div className="px-3 py-1 text-[11px] text-muted-foreground border-b border-border/50 bg-muted/20 sticky top-0">
            {selectedChange.file}
          </div>
          <DiffView diff={selectedChange.diff} />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-popover py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === "file" && (
            <>
              {/* Open Changes */}
              <button
                onClick={() => {
                  selectFile(contextMenu.file, "changes");
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <FileText className="size-3.5" />
                Open Changes
              </button>

              {/* Separator */}
              <div className="my-1 h-px bg-border" />

              {/* Stage / Unstage */}
              <button
                onClick={() => {
                  toggleStage(contextMenu.file, contextMenu.staged);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                {contextMenu.staged ? (
                  <><Minus className="size-3.5" /> Unstage Changes</>
                ) : (
                  <><Plus className="size-3.5" /> Stage Changes</>
                )}
              </button>

              {/* Discard */}
              <button
                onClick={() => {
                  confirmDiscardFile(contextMenu.file);
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-accent"
              >
                <Undo2 className="size-3.5" />
                Discard Changes
              </button>

              {/* Separator */}
              <div className="my-1 h-px bg-border" />

              {/* Copy Path */}
              <button
                onClick={() => {
                  const fullPath = activeProjectPath
                    ? `${activeProjectPath}/${contextMenu.file}`
                    : contextMenu.file;
                  copyToClipboard(fullPath);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <Clipboard className="size-3.5" />
                Copy Path
              </button>

              {/* Copy Relative Path */}
              <button
                onClick={() => copyToClipboard(contextMenu.file)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <Copy className="size-3.5" />
                Copy Relative Path
              </button>
            </>
          )}

          {contextMenu.type === "section" && contextMenu.section === "staged" && (
            <>
              <button
                onClick={() => {
                  unstageAll();
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <Minus className="size-3.5" />
                Unstage All Changes
              </button>
            </>
          )}

          {contextMenu.type === "section" && contextMenu.section === "unstaged" && (
            <>
              <button
                onClick={() => {
                  stageAll();
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <Plus className="size-3.5" />
                Stage All Changes
              </button>
              <button
                onClick={() => {
                  confirmDiscardAll();
                  setContextMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-accent"
              >
                <Undo2 className="size-3.5" />
                Discard All Changes
              </button>
            </>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel="Discard"
        onConfirm={confirmDialog.onConfirm}
        destructive
      />
    </div>
  );
}
