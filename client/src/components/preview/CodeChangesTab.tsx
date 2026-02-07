import { useState } from 'react';
import { FileCode, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockGitChanges } from '@/mocks/git-changes';

export function CodeChangesTab() {
  const [expandedFile, setExpandedFile] = useState<string | null>(mockGitChanges[0]?.file || null);
  const [filter, setFilter] = useState<'all' | 'staged' | 'unstaged'>('all');

  const filtered = mockGitChanges.filter((c) => {
    if (filter === 'staged') return c.staged;
    if (filter === 'unstaged') return !c.staged;
    return true;
  });

  return (
    <div className="p-3 space-y-2">
      {/* Filter Bar */}
      <div className="flex items-center gap-1 mb-3">
        {(['all', 'staged', 'unstaged'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-2.5 py-1 text-[11px] rounded-md capitalize transition-colors',
              filter === f
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {filtered.length} file{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* File List */}
      {filtered.map((change) => (
        <div key={change.file} className="rounded-lg border border-border overflow-hidden">
          {/* File Header */}
          <button
            onClick={() => setExpandedFile(expandedFile === change.file ? null : change.file)}
            className="w-full px-3 py-2 flex items-center gap-2 text-xs hover:bg-muted/30 transition-colors"
          >
            <FileCode size={13} className={cn(
              change.status === 'added' ? 'text-green-400' :
              change.status === 'deleted' ? 'text-red-400' :
              'text-yellow-400'
            )} />
            <span className="font-mono text-foreground truncate flex-1 text-left">{change.file}</span>
            <div className="flex items-center gap-2 shrink-0">
              {change.staged && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">staged</span>
              )}
              <span className="flex items-center gap-0.5 text-green-400 text-[11px]">
                <Plus size={10} />{change.additions}
              </span>
              <span className="flex items-center gap-0.5 text-red-400 text-[11px]">
                <Minus size={10} />{change.deletions}
              </span>
            </div>
          </button>

          {/* Diff View */}
          {expandedFile === change.file && (
            <div className="border-t border-border bg-background/50 overflow-x-auto">
              <pre className="text-[11px] font-mono p-3 leading-5">
                {change.diff.split('\n').map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'px-2 -mx-2',
                      line.startsWith('+') && !line.startsWith('+++') ? 'bg-green-500/10 text-green-300' :
                      line.startsWith('-') && !line.startsWith('---') ? 'bg-red-500/10 text-red-300' :
                      line.startsWith('@@') ? 'text-blue-400' :
                      'text-muted-foreground'
                    )}
                  >
                    {line}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
