import { useEffect } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { PreviewPanel } from '@/components/preview/PreviewPanel';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { StatusBar } from '@/components/layout/StatusBar';
import { useUIStore } from '@/stores/ui';
import { useProjectStore } from '@/stores/projects';
import { useChatStore } from '@/stores/chat';
import { usePreviewStore } from '@/stores/preview';
import { cn } from '@/lib/utils';

export function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const previewOpen = useUIStore((s) => s.previewOpen);
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const threads = useChatStore((s) => s.threads);
  const projects = useProjectStore((s) => s.projects);

  // Initialize persistent data on app start
  useEffect(() => {
    useUIStore.getState().checkBackendHealth();
    useProjectStore.getState().loadProjects();
    useChatStore.getState().loadThreads();
  }, []);

  // Derive active project from active thread and sync to preview store
  useEffect(() => {
    if (!activeThreadId) {
      usePreviewStore.getState().setActiveProject(null, null, null);
      return;
    }
    const thread = threads.find((t) => t.id === activeThreadId);
    if (!thread) return;
    const project = projects.find((p) => p.id === thread.projectId);
    if (project) {
      usePreviewStore.getState().setActiveProject(project.id, project.path, project.name);
    }
  }, [activeThreadId, threads, projects]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {sidebarOpen && (
          <div className="w-[280px] min-w-[280px] border-r border-border bg-sidebar">
            <Sidebar />
          </div>
        )}

        {/* Main Content Area - Chat + Preview */}
        <Group orientation="horizontal" className="flex-1">
          <Panel minSize={30} defaultSize={previewOpen ? 55 : 100}>
            <ChatPanel />
          </Panel>

          {previewOpen && (
            <>
              <Separator
                className={cn(
                  'w-[1px] bg-border hover:bg-primary/50 transition-colors',
                  'data-[resize-handle-active]:bg-primary'
                )}
              />
              <Panel minSize={25} defaultSize={45}>
                <PreviewPanel />
              </Panel>
            </>
          )}
        </Group>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Settings Dialog */}
      <SettingsDialog />
    </div>
  );
}
