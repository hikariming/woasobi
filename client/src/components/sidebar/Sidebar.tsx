import { useState } from "react";
import {
  Plus, Zap, Wrench, Puzzle, Settings, Search,
  ChevronDown, ArrowLeft, FolderOpen,
  FileCode, Bug, RefreshCw, FlaskConical, FileText,
  Image, Globe, Terminal, GitBranch, Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore, useUIStore } from "@/stores";
import { mockWorkspaces } from "@/mocks/workspaces";
import { mockSkills } from "@/mocks/skills";
import { mockTools } from "@/mocks/tools";

const skillIconMap: Record<string, React.ElementType> = {
  FileCode, Search, Bug, RefreshCw, FlaskConical, FileText, Image, Globe,
};
const toolIconMap: Record<string, React.ElementType> = {
  Terminal, FolderOpen, GitBranch, Plug,
};

export function Sidebar() {
  const { threads, activeThreadId, setActiveThread, createThread } = useChatStore();
  const { secondaryPanel, setSecondaryPanel, setSettingsOpen } = useUIStore();
  const [searchQuery, setSearchQuery] = useState("");

  const grouped = mockWorkspaces.map((ws) => ({
    ws,
    items: threads
      .filter((t) => t.workspaceId === ws.id)
      .filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase())),
  })).filter((g) => g.items.length > 0);

  if (secondaryPanel) {
    return <SecondaryPanel type={secondaryPanel} onBack={() => setSecondaryPanel(null)} />;
  }

  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="text-sm font-semibold tracking-tight">WoaSobi</span>
      </div>

      {/* New Thread */}
      <div className="px-3 pb-2">
        <button
          onClick={() => createThread("ws-woasobi")}
          className="bg-primary/10 text-primary hover:bg-primary/20 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
        >
          <Plus className="size-4" />
          New Thread
        </button>
      </div>

      {/* Quick Actions */}
      <div className="border-border space-y-0.5 border-b px-3 pb-2">
        {[
          { icon: Zap, label: "Automations", key: "automations" as const },
          { icon: Wrench, label: "Skills", key: "skills" as const },
          { icon: Puzzle, label: "Tools", key: "tools" as const },
        ].map((a) => (
          <button
            key={a.key}
            onClick={() => setSecondaryPanel(a.key)}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
          >
            <a.icon className="size-4" />
            {a.label}
          </button>
        ))}
      </div>

      {/* Threads header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-muted-foreground text-xs font-medium">Threads</span>
        <Search className="text-muted-foreground size-3.5" />
      </div>

      {/* Search */}
      <div className="px-3 pb-1">
        <input
          type="text"
          placeholder="Search threads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-border bg-muted/50 focus:border-primary/50 w-full rounded-md border px-2 py-1 text-xs outline-none"
        />
      </div>

      {/* Thread list */}
      <div className="scrollbar-thin flex-1 overflow-y-auto px-1.5">
        {grouped.map(({ ws, items }) => (
          <WsGroup key={ws.id} name={ws.name} threads={items} activeId={activeThreadId} onSelect={setActiveThread} />
        ))}
      </div>

      {/* Footer */}
      <div className="border-border flex items-center justify-between border-t p-3">
        <button onClick={() => setSettingsOpen(true)} className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
          <Settings className="size-4" /> Settings
        </button>
        <button className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium">Upgrade</button>
      </div>
    </div>
  );
}

function WsGroup({ name, threads, activeId, onSelect }: {
  name: string;
  threads: { id: string; title: string; updatedAt: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-1.5 py-1 text-xs font-medium">
        <ChevronDown className={cn("size-3 transition-transform", !open && "-rotate-90")} />
        <FolderOpen className="size-3" />
        {name}
      </button>
      {open && (
        <div className="ml-2 space-y-0.5">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                t.id === activeId ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <span className="truncate pr-2">{t.title}</span>
              <span className="text-muted-foreground shrink-0 text-[10px]">{t.updatedAt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SecondaryPanel({ type, onBack }: { type: "skills" | "tools" | "automations"; onBack: () => void }) {
  const title = type === "skills" ? "Skills" : type === "tools" ? "Tools" : "Automations";
  const list = type === "skills" ? mockSkills : type === "tools" ? mockTools : [];
  const iconMap = type === "skills" ? skillIconMap : toolIconMap;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-2 border-b p-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /></button>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-3 pb-2">
        <input type="text" placeholder={`Search ${type}...`} className="border-border bg-muted/50 w-full rounded-md border px-2 py-1.5 text-xs outline-none" />
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-3">
        {list.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-xs">
            No {type} configured yet.
            <br />
            <button className="text-primary mt-2 hover:underline">+ Create</button>
          </div>
        ) : (
          list.map((item) => {
            const Icon = iconMap[item.icon] || Puzzle;
            return (
              <button key={item.id} className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors">
                <Icon className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="text-foreground text-sm">{item.name}</div>
                  <div className="text-muted-foreground truncate text-xs">{item.description}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="border-border border-t p-3">
        <button className="text-primary flex items-center gap-1 text-sm hover:underline">
          <Plus className="size-3.5" /> {type === "skills" ? "Create Custom Skill" : type === "tools" ? "Add MCP Tool" : "Create Automation"}
        </button>
      </div>
    </div>
  );
}
