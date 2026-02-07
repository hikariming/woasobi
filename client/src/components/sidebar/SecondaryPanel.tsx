import {
  ArrowLeft, Plus, Puzzle,
  FileCode, Search, Bug, RefreshCw, FlaskConical, FileText,
  Image, Globe, Terminal, FolderOpen, GitBranch, Plug,
} from "lucide-react";
import { mockSkills } from "@/mocks/skills";
import { mockTools } from "@/mocks/tools";

const skillIconMap: Record<string, React.ElementType> = {
  FileCode, Search, Bug, RefreshCw, FlaskConical, FileText, Image, Globe,
};
const toolIconMap: Record<string, React.ElementType> = {
  Terminal, FolderOpen, GitBranch, Plug,
};

interface SecondaryPanelProps {
  type: "skills" | "tools" | "automations";
  onBack: () => void;
}

export function SecondaryPanel({ type, onBack }: SecondaryPanelProps) {
  const title = type === "skills" ? "Skills" : type === "tools" ? "Tools" : "Automations";
  const list = type === "skills" ? mockSkills : type === "tools" ? mockTools : [];
  const iconMap = type === "skills" ? skillIconMap : toolIconMap;

  return (
    <div className="flex h-full flex-col">
      <div className="border-border flex items-center gap-2 border-b p-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-3 pb-2">
        <input
          type="text"
          placeholder={`Search ${type}...`}
          className="border-border bg-muted/50 w-full rounded-md border px-2 py-1.5 text-xs outline-none"
        />
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
              <button
                key={item.id}
                className="hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors"
              >
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
          <Plus className="size-3.5" />{" "}
          {type === "skills" ? "Create Custom Skill" : type === "tools" ? "Add MCP Tool" : "Create Automation"}
        </button>
      </div>
    </div>
  );
}
