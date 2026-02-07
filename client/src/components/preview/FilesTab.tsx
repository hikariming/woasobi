import { Loader2, Search } from "lucide-react";
import type { FileTreeNode } from "@/types";
import { usePreviewStore } from "@/stores/preview";
import { FileTreeNode as TreeNode } from "./files/FileTreeNode";

function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query.trim()) return nodes;
  const lower = query.toLowerCase();

  return nodes
    .map((node) => {
      if (node.type === "file") {
        const hit =
          node.name.toLowerCase().includes(lower) || node.path.toLowerCase().includes(lower);
        return hit ? node : null;
      }

      const children = filterTree(node.children || [], query);
      const dirHit =
        node.name.toLowerCase().includes(lower) || node.path.toLowerCase().includes(lower);
      if (dirHit || children.length > 0) {
        return { ...node, children };
      }
      return null;
    })
    .filter(Boolean) as FileTreeNode[];
}

export function FilesTab() {
  const {
    filesTree,
    filesQuery,
    filesLoading,
    expandedDirs,
    selectedPath,
    touchedFiles,
    activeProjectName,
    setFilesQuery,
    toggleDirExpanded,
    selectFile,
  } = usePreviewStore();

  const filtered = filterTree(filesTree, filesQuery);

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-border space-y-2">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {activeProjectName ? `Project: ${activeProjectName}` : "No project selected"}
          {filesLoading && <Loader2 size={10} className="animate-spin" />}
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filesQuery}
            onChange={(event) => setFilesQuery(event.target.value)}
            placeholder="Search files"
            className="w-full h-7 rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="py-1 overflow-y-auto flex-1">
        {filesLoading && filesTree.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {!filesLoading && filesTree.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            {activeProjectName ? "No files found in project." : "Select a project to browse files."}
          </div>
        )}
        {filtered.length === 0 && filesTree.length > 0 && (
          <div className="px-3 py-2 text-xs text-muted-foreground">No files match your search.</div>
        )}
        {filtered.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            expandedDirs={expandedDirs}
            selectedPath={selectedPath}
            touchedFiles={touchedFiles}
            onToggleDir={toggleDirExpanded}
            onSelectFile={(path) => selectFile(path, "files")}
          />
        ))}
      </div>
    </div>
  );
}
