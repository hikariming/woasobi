import { Panel, Group, Separator } from "react-resizable-panels";
import { useUIStore } from "@/stores";
import { Sidebar } from "../sidebar/Sidebar";
import { ChatPanel } from "../chat/ChatPanel";
import { PreviewPanel } from "../preview/PreviewPanel";

export function AppLayout() {
  const { sidebarOpen, previewOpen } = useUIStore();

  return (
    <div className="bg-background text-foreground flex h-screen w-screen overflow-hidden">
      <Group orientation="horizontal">
        {sidebarOpen && (
          <>
            <Panel id="sidebar" defaultSize={20} minSize={15} maxSize={30} className="bg-sidebar">
              <Sidebar />
            </Panel>
            <Separator className="hover:bg-primary/20 w-[1px] bg-transparent transition-colors" />
          </>
        )}

        <Panel id="chat" minSize={30}>
          <ChatPanel />
        </Panel>

        {previewOpen && (
          <>
            <Separator className="hover:bg-primary/20 w-[1px] bg-transparent transition-colors" />
            <Panel id="preview" defaultSize={35} minSize={20} maxSize={50}>
              <PreviewPanel />
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
}
