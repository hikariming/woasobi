import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TerminalSession } from "@/types";

interface TerminalTabsProps {
  sessions: TerminalSession[];
  activeId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void | Promise<void>;
  onClose: (id: string) => void;
}

export function TerminalTabs({ sessions, activeId, onSwitch, onAdd, onClose }: TerminalTabsProps) {
  return (
    <div className="h-9 px-2 border-b border-border flex items-center gap-1 overflow-x-auto shrink-0">
      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSwitch(session.id)}
          className={cn(
            "group inline-flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md text-xs transition-colors",
            activeId === session.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <span>{session.name}</span>
          <span
            className="opacity-60 group-hover:opacity-100 hover:text-red-400"
            onClick={(event) => {
              event.stopPropagation();
              onClose(session.id);
            }}
          >
            <X size={11} />
          </span>
        </button>
      ))}
      <button
        onClick={onAdd}
        className="inline-flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
