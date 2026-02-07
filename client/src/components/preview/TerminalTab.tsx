import { Square, Trash2, Terminal as TerminalIcon } from "lucide-react";
import { useMemo, useRef, useEffect } from "react";
import { usePreviewStore } from "@/stores/preview";
import { TerminalTabs } from "./terminal/TerminalTabs";
import { XTerminal } from "./terminal/XTerminal";

export function TerminalTab() {
  const {
    terminalSessions,
    activeTerminalSessionId,
    terminalRunning,
    activeProjectId,
    switchTerminalSession,
    addRealTerminalSession,
    closeTerminalSession,
    clearTerminalSession,
    stopTerminal,
  } = usePreviewStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoCreatedRef = useRef(false);

  const activeSession = useMemo(
    () => terminalSessions.find((session) => session.id === activeTerminalSessionId),
    [terminalSessions, activeTerminalSessionId]
  );

  const isInteractive = !!activeSession?.projectId;

  // Auto-create a real terminal when tab is shown with no sessions
  useEffect(() => {
    if (terminalSessions.length === 0 && activeProjectId && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      addRealTerminalSession();
    }
    if (terminalSessions.length > 0) {
      autoCreatedRef.current = false;
    }
  }, [terminalSessions.length, activeProjectId, addRealTerminalSession]);

  // Auto-scroll agent terminal to bottom when new lines appear
  useEffect(() => {
    if (!isInteractive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.lines.length, isInteractive]);

  // Empty state — no sessions and no project
  if (terminalSessions.length === 0 && !activeProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 bg-[oklch(0.13_0_0)]">
        <TerminalIcon size={24} className="text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground">No terminal sessions</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select a project first, then open a terminal.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[oklch(0.13_0_0)]">
      {terminalSessions.length > 0 && (
        <TerminalTabs
          sessions={terminalSessions}
          activeId={activeTerminalSessionId}
          onSwitch={switchTerminalSession}
          onAdd={addRealTerminalSession}
          onClose={closeTerminalSession}
        />
      )}

      {isInteractive ? (
        /* Interactive shell — full xterm.js terminal */
        <div className="flex-1 min-h-0">
          <XTerminal
            key={activeSession.id}
            projectId={activeSession.projectId!}
          />
        </div>
      ) : activeSession ? (
        /* Agent output — line-based rendering */
        <>
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

          <div ref={scrollRef} className="flex-1 p-3 font-mono text-xs overflow-y-auto">
            {(activeSession.lines || []).map((line) => (
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
        </>
      ) : null}
    </div>
  );
}
