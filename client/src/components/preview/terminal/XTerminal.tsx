import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WS_BASE_URL } from "@/config/api";
import "@xterm/xterm/css/xterm.css";

interface XTerminalProps {
  projectId: string;
  onExit?: (code: number) => void;
}

export function XTerminal({ projectId, onExit }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  const connect = useCallback((container: HTMLDivElement, pid: string) => {
    let disposed = false;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
      lineHeight: 1.2,
      theme: {
        background: "#1a1a1a",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        selectionBackground: "#264f78",
        black: "#1a1a1a",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#d4d4d4",
        brightBlack: "#737373",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde68a",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#f5f5f5",
      },
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);

    // Small delay so the container has actual dimensions before fitting
    requestAnimationFrame(() => {
      if (disposed) return;
      fit.fit();
    });

    const cols = term.cols || 120;
    const rows = term.rows || 30;
    const wsUrl = `${WS_BASE_URL}/terminal/ws?projectId=${encodeURIComponent(pid)}&cols=${cols}&rows=${rows}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (disposed) return;
      // Send correct size after fit
      requestAnimationFrame(() => {
        if (disposed || ws.readyState !== WebSocket.OPEN) return;
        fit.fit();
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      });
    };

    ws.onmessage = (event) => {
      if (disposed) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "output") {
          term.write(msg.data);
        } else if (msg.type === "exit") {
          term.write(`\r\n\x1b[90m[Process exited with code ${msg.code}]\x1b[0m\r\n`);
          onExitRef.current?.(msg.code);
        }
      } catch {
        if (!disposed) term.write(event.data);
      }
    };

    ws.onerror = () => {
      if (disposed) return;
      term.write("\r\n\x1b[31m[Connection error]\x1b[0m\r\n");
    };

    ws.onclose = () => {
      if (disposed) return;
      term.write("\r\n\x1b[90m[Disconnected]\x1b[0m\r\n");
    };

    // Terminal input → WebSocket
    const inputDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      try {
        fit.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      } catch {
        // Ignore resize errors during teardown
      }
    });
    resizeObserver.observe(container);

    term.focus();

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      inputDisposable.dispose();
      ws.close();
      term.dispose();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanup = connect(container, projectId);
    return cleanup;
  }, [projectId, connect]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ padding: "4px 0 0 8px" }}
    />
  );
}
