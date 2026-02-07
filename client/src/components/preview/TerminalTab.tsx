import { Square, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { usePreviewStore } from "@/stores/preview";
import { TerminalTabs } from "./terminal/TerminalTabs";

export function TerminalTab() {
  const {
    terminalSessions,
    activeTerminalSessionId,
    terminalRunning,
    switchTerminalSession,
    addTerminalSession,
    closeTerminalSession,
    clearTerminalSession,
    stopTerminal,
  } = usePreviewStore();

  const activeSession = useMemo(
    () => terminalSessions.find((session) => session.id === activeTerminalSessionId),
    [terminalSessions, activeTerminalSessionId]
  );

  return (
    <div className="h-full flex flex-col bg-[oklch(0.13_0_0)]">
      <TerminalTabs
        sessions={terminalSessions}
        activeId={activeTerminalSessionId}
        onSwitch={switchTerminalSession}
        onAdd={addTerminalSession}
        onClose={closeTerminalSession}
      />

      <div className="px-2 py-1.5 border-b border-border/40 flex items-center justify-end gap-1">
        <button
          onClick={() => clearTerminalSession(activeTerminalSessionId)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
        >
          <Trash2 size={11} />
          Clear
        </button>
        <button
          onClick={stopTerminal}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-red-300 hover:bg-muted/20 transition-colors"
        >
          <Square size={11} />
          Stop
        </button>
      </div>

      <div className="flex-1 p-3 font-mono text-xs overflow-y-auto">
        {(activeSession?.lines || []).map((line) => (
          <div
            key={line.id}
            className={
              line.type === "cmd"
                ? "text-green-400 mt-2 first:mt-0"
                : line.type === "err"
                  ? "text-red-300"
                  : line.type === "info"
                    ? "text-blue-300"
                    : "text-muted-foreground"
            }
          >
            {line.text || "\u00A0"}
          </div>
        ))}
        {terminalRunning && (
          <div className="mt-2 text-green-400">
            $ <span className="inline-block w-1.5 h-3.5 bg-green-400/70 animate-pulse align-middle" />
          </div>
        )}
      </div>
    </div>
  );
}
