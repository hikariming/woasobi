import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTreeNode as FileTreeNodeType } from "@/types";

const extColors: Record<string, string> = {
  ts: "text-blue-400",
  tsx: "text-blue-300",
  js: "text-yellow-400",
  jsx: "text-yellow-300",
  json: "text-green-400",
  prisma: "text-purple-400",
  sql: "text-orange-400",
};

interface Props {
  node: FileTreeNodeType;
  depth?: number;
  expandedDirs: string[];
  selectedPath: string | null;
  onToggleDir: (path: string) => void;
  onSelectFile: (path: string) => void;
}

export function FileTreeNode({
  node,
  depth = 0,
  expandedDirs,
  selectedPath,
  onToggleDir,
  onSelectFile,
}: Props) {
  const expanded = expandedDirs.includes(node.path);

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => onToggleDir(node.path)}
          className="w-full flex items-center gap-1.5 py-1 px-2 text-xs hover:bg-muted/50 transition-colors text-foreground"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? (
            <FolderOpen size={13} className="text-yellow-500/70" />
          ) : (
            <Folder size={13} className="text-yellow-500/70" />
          )}
          <span>{node.name}</span>
        </button>

        {expanded &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "w-full flex items-center gap-1.5 py-1 px-2 text-xs hover:bg-muted/50 cursor-pointer transition-colors",
        selectedPath === node.path ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      <File size={13} className={cn(extColors[node.ext || ""] || "text-muted-foreground")} />
      <span className="truncate text-left">{node.name}</span>
    </button>
  );
}
