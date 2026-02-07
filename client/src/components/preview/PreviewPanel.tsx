import { Code, FileText, Terminal, Image, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';
import { CodeChangesTab } from './CodeChangesTab';
import { ArtifactTab } from './ArtifactTab';
import { TerminalTab } from './TerminalTab';
import { ImageTab } from './ImageTab';
import { FilesTab } from './FilesTab';
import type { PreviewTab } from '@/types';

const tabs: Array<{ id: PreviewTab; label: string; icon: React.ReactNode }> = [
  { id: 'changes', label: 'Changes', icon: <Code size={13} /> },
  { id: 'artifacts', label: 'Artifacts', icon: <FileText size={13} /> },
  { id: 'terminal', label: 'Terminal', icon: <Terminal size={13} /> },
  { id: 'images', label: 'Images', icon: <Image size={13} /> },
  { id: 'files', label: 'Files', icon: <FolderTree size={13} /> },
];

export function PreviewPanel() {
  const { previewTab, setPreviewTab } = useUIStore();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tab Bar */}
      <div className="h-12 px-2 flex items-center gap-0.5 border-b border-border shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPreviewTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors',
              previewTab === tab.id
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {previewTab === 'changes' && <CodeChangesTab />}
        {previewTab === 'artifacts' && <ArtifactTab />}
        {previewTab === 'terminal' && <TerminalTab />}
        {previewTab === 'images' && <ImageTab />}
        {previewTab === 'files' && <FilesTab />}
      </div>
    </div>
  );
}
