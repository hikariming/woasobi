import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockFileTree } from '@/mocks/file-tree';
import type { FileTreeNode } from '@/types';

const extColors: Record<string, string> = {
  ts: 'text-blue-400',
  tsx: 'text-blue-300',
  js: 'text-yellow-400',
  jsx: 'text-yellow-300',
  json: 'text-green-400',
  prisma: 'text-purple-400',
  sql: 'text-orange-400',
};

function FileNode({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
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
        {expanded && node.children?.map((child) => (
          <FileNode key={child.path} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 py-1 px-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer transition-colors"
      style={{ paddingLeft: `${depth * 16 + 28}px` }}
    >
      <File size={13} className={cn(extColors[node.ext || ''] || 'text-muted-foreground')} />
      <span>{node.name}</span>
    </div>
  );
}

export function FilesTab() {
  return (
    <div className="py-1">
      {mockFileTree.map((node) => (
        <FileNode key={node.path} node={node} />
      ))}
    </div>
  );
}
