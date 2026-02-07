import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Message, MessagePart, Thread, ToolCall } from "@/types";
import { sendAgentRequest, parseSSEStream, stopAgent } from "@/lib/api/agent";
import {
  fetchThreads,
  createThread as apiCreateThread,
  updateThread as apiUpdateThread,
  deleteThread as apiDeleteThread,
  clearProjectThreads as apiClearProjectThreads,
  fetchMessages,
} from "@/lib/api/data";
import { useSettingsStore } from "./settings";
import { useUIStore } from "./ui";
import { usePreviewStore } from "./preview";

/** Extract a human-readable summary for non-Bash tool calls */
function getToolSummary(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "Read": return String(input?.file_path || input?.path || "");
    case "Edit": return String(input?.file_path || input?.path || "");
    case "Write": return String(input?.file_path || input?.path || "");
    case "Glob": return String(input?.pattern || "");
    case "Grep": return String(input?.pattern || "");
    case "WebSearch": return String(input?.query || "");
    case "WebFetch": return String(input?.url || "");
    case "Task": return String(input?.description || input?.prompt || "").slice(0, 60);
    case "TodoWrite": return "updating tasks";
    default: return JSON.stringify(input).slice(0, 80);
  }
}

export type ThreadRuntimeStatus = "running" | "awaiting-permission" | "completed";

interface ChatStore {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Record<string, Message[]>;
  streamingText: string | null;
  streamingToolCalls: ToolCall[];
  streamingParts: MessagePart[];
  isStreaming: boolean;
  currentSessionId: string | null;
  abortController: AbortController | null;
  threadRuntimeStatus: Record<string, ThreadRuntimeStatus>;
  threadsLoading: boolean;
  messagesLoading: boolean;
  loadThreads: (projectId?: string) => Promise<void>;
  setActiveThread: (id: string) => Promise<void>;
  createThread: (projectId: string) => Promise<void>;
  sendMessage: (content: string) => void;
  stopStreaming: () => void;
  deleteThread: (id: string) => Promise<void>;
  renameThread: (id: string, title: string) => Promise<void>;
  clearProjectThreads: (projectId: string) => Promise<void>;
  clearThreadStatus: (threadId: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: {},
  streamingText: null,
  streamingToolCalls: [],
  streamingParts: [],
  isStreaming: false,
  currentSessionId: null,
  abortController: null,
  threadRuntimeStatus: {},
  threadsLoading: false,
  messagesLoading: false,

  clearThreadStatus: (threadId) => {
    set((s) => {
      const { [threadId]: _, ...rest } = s.threadRuntimeStatus;
      return { threadRuntimeStatus: rest };
    });
  },

  loadThreads: async (projectId?) => {
    set({ threadsLoading: true });
    try {
      const threads = await fetchThreads(projectId);
      set({ threads });
    } catch {
      // Backend might be offline
    } finally {
      set({ threadsLoading: false });
    }
  },

  setActiveThread: async (id) => {
    set({ activeThreadId: id });

    // Lazy-load messages if not cached
    if (!get().messages[id]) {
      set({ messagesLoading: true });
      try {
        const msgs = await fetchMessages(id);
        // Add threadId to each message (backend omits it since it's in the filename)
        const withThreadId = msgs.map((m) => ({ ...m, threadId: id }));
        set((s) => ({
          messages: { ...s.messages, [id]: withThreadId },
          messagesLoading: false,
        }));
      } catch {
        set({ messagesLoading: false });
      }
    }
  },

  createThread: async (projectId) => {
    const uiStore = useUIStore.getState();
    try {
      const thread = await apiCreateThread({
        projectId,
        mode: uiStore.activeMode === "codex" ? "codex" : "claudeCode",
        model: uiStore.activeModelId,
      });
      set((s) => ({
        threads: [thread, ...s.threads],
        activeThreadId: thread.id,
        messages: { ...s.messages, [thread.id]: [] },
      }));
    } catch {
      // Failed to create thread (backend offline?)
    }
  },

  sendMessage: async (content) => {
    const { activeThreadId } = get();
    if (!activeThreadId) return;

    const messageId = `m-${nanoid(6)}`;

    // Add user message optimistically
    const userMsg: Message = {
      id: messageId,
      threadId: activeThreadId,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      messages: {
        ...s.messages,
        [activeThreadId]: [...(s.messages[activeThreadId] || []), userMsg],
      },
    }));

    // Prepare streaming state
    const abortController = new AbortController();
    set({
      isStreaming: true,
      streamingText: "",
      streamingToolCalls: [],
      streamingParts: [],
      currentSessionId: null,
      abortController,
      threadRuntimeStatus: {
        ...get().threadRuntimeStatus,
        [activeThreadId]: "running",
      },
    });

    // Get config from stores
    const settings = useSettingsStore.getState();
    const uiStore = useUIStore.getState();
    const provider = uiStore.activeMode === "codex" ? "codex" as const : "claude" as const;
    const modelConfig = settings.getModelConfig(uiStore.activeMode);
    const permissionMode = uiStore.permissionMode;

    // Build conversation history from thread messages
    const threadMsgs = get().messages[activeThreadId] || [];
    const conversation = threadMsgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    let fullText = "";
    const toolCalls: ToolCall[] = [];
    const parts: MessagePart[] = [];
    let cost: number | undefined;
    let duration: number | undefined;

    // Prepare preview panel for this run
    const preview = usePreviewStore.getState();
    preview.clearActiveTerminal();
    preview.clearTouchedFiles();
    preview.clearArtifacts();
    preview.setTerminalRunning(true);
    useUIStore.getState().setPreviewTab("terminal");

    try {
      const response = await sendAgentRequest(content, {
        provider,
        modelConfig,
        conversation,
        signal: abortController.signal,
        threadId: activeThreadId,
        messageId,
        permissionMode,
      });

      await parseSSEStream(response, (msg) => {
        switch (msg.type) {
          case "session":
            set({ currentSessionId: msg.sessionId || null });
            break;

          case "init": {
            const uiActions = useUIStore.getState();
            if (msg.permissionMode) {
              uiActions.setPermissionMode(msg.permissionMode);
            }
            if (msg.slashCommands && msg.slashCommands.length > 0) {
              uiActions.setSlashCommands(
                msg.slashCommands.map((name: string) => ({
                  name,
                  description: "",
                  argumentHint: "",
                }))
              );
            }
            break;
          }

          case "status":
            if (msg.permissionMode) useUIStore.getState().setPermissionMode(msg.permissionMode);
            set((s) => ({
              threadRuntimeStatus: {
                ...s.threadRuntimeStatus,
                [activeThreadId]: msg.awaitingPermission ? "awaiting-permission" : "running",
              },
            }));
            break;

          case "text":
            if (msg.content) {
              fullText += msg.content;
              // Append to last text part or create new one
              const lastTextPart = parts[parts.length - 1];
              if (lastTextPart && lastTextPart.type === "text") {
                lastTextPart.content += msg.content;
              } else {
                parts.push({ type: "text", content: msg.content });
              }
              set({ streamingText: fullText, streamingParts: [...parts] });
              // Detect HTML artifacts in streamed text
              preview.extractArtifactsFromText(fullText);
            }
            set((s) => ({
              threadRuntimeStatus: {
                ...s.threadRuntimeStatus,
                [activeThreadId]: "running",
              },
            }));
            break;

          case "tool_use":
            if (msg.name && msg.id) {
              const tc: ToolCall = {
                id: msg.id,
                name: msg.name,
                args: (msg.input as Record<string, unknown>) || {},
              };
              toolCalls.push(tc);
              parts.push({ type: "tool_use", id: msg.id, name: msg.name, args: tc.args });
              set({ streamingToolCalls: [...toolCalls], streamingParts: [...parts] });

              // Route to Terminal tab
              const input = (msg.input as Record<string, unknown>) || {};
              if (msg.name === "Bash") {
                const cmd = String(input.command || "");
                preview.appendTerminalLine({ type: "cmd", text: `$ ${cmd}` });
              } else {
                const summary = getToolSummary(msg.name, input);
                preview.appendTerminalLine({ type: "info", text: `${msg.name}: ${summary}` });
              }

              // Track touched files
              if (["Read", "Edit", "Write"].includes(msg.name)) {
                const filePath = String(input.file_path || input.path || "");
                if (filePath) preview.addTouchedFile(filePath);
              }

              // Detect HTML file writes for Artifacts
              if (msg.name === "Write") {
                const filePath = String(input.file_path || "");
                const content = String(input.content || "");
                if ((filePath.endsWith(".html") || filePath.endsWith(".htm")) && content.length > 50) {
                  preview.addArtifact(filePath.split("/").pop() || "HTML File", content);
                }
              }
            }
            set((s) => ({
              threadRuntimeStatus: {
                ...s.threadRuntimeStatus,
                [activeThreadId]: "running",
              },
            }));
            break;

          case "tool_result":
            if (msg.toolUseId) {
              const tc = toolCalls.find((t) => t.id === msg.toolUseId);
              if (tc) {
                tc.output = msg.output;
                // Also update the matching part
                const toolPart = parts.find((p) => p.type === "tool_use" && p.id === msg.toolUseId);
                if (toolPart && toolPart.type === "tool_use") {
                  toolPart.output = msg.output;
                  toolPart.isError = msg.isError;
                }
                set({ streamingToolCalls: [...toolCalls], streamingParts: [...parts] });

                // Route Bash output to Terminal tab
                if (tc.name === "Bash") {
                  const output = msg.output || "";
                  const lineType = msg.isError ? "err" as const : "out" as const;
                  const lines = output.split("\n");
                  // Truncate very long output
                  const maxLines = 200;
                  const display = lines.length > maxLines
                    ? [...lines.slice(0, maxLines), `... (${lines.length - maxLines} more lines)`]
                    : lines;
                  for (const line of display) {
                    preview.appendTerminalLine({ type: lineType, text: line });
                  }
                }
              }
            }
            break;

          case "result":
            cost = msg.cost;
            duration = msg.duration;
            break;

          case "error": {
            const errorContent = msg.message || "Unknown error";
            const errText = fullText ? `\n\n**Error:** ${errorContent}` : `**Error:** ${errorContent}`;
            fullText += errText;
            const lastErrPart = parts[parts.length - 1];
            if (lastErrPart && lastErrPart.type === "text") {
              lastErrPart.content += errText;
            } else {
              parts.push({ type: "text", content: errText });
            }
            set({ streamingText: fullText, streamingParts: [...parts] });
            break;
          }

          case "done":
            break;
        }
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // User cancelled
      } else {
        const errorMsg = error instanceof Error ? error.message : String(error);
        fullText += fullText
          ? `\n\n**Connection Error:** ${errorMsg}`
          : `**Connection Error:** ${errorMsg}`;
      }
    } finally {
      // Stop terminal running indicator
      preview.setTerminalRunning(false);

      // Refresh files and git status after agent completes
      const projectId = preview.activeProjectId;
      if (projectId) {
        preview.loadFiles(projectId);
        preview.loadGitStatus(projectId);
      }

      // Create final assistant message in local state
      if (fullText) {
        const aiMsg: Message = {
          id: `m-${nanoid(6)}`,
          threadId: activeThreadId,
          role: "assistant",
          content: fullText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          parts: parts.length > 0 ? parts : undefined,
          timestamp: new Date().toISOString(),
          cost,
          duration,
          isError: fullText.includes("**Error:**") || fullText.includes("**Connection Error:**"),
        };

        set((s) => ({
          isStreaming: false,
          streamingText: null,
          streamingToolCalls: [],
          streamingParts: [],
          currentSessionId: null,
          abortController: null,
          threadRuntimeStatus: {
            ...s.threadRuntimeStatus,
            [activeThreadId]: "completed",
          },
          messages: {
            ...s.messages,
            [activeThreadId]: [
              ...(s.messages[activeThreadId] || []),
              aiMsg,
            ],
          },
        }));

        // Auto-clear completed status after 5s (historical threads don't need indicators)
        setTimeout(() => {
          const current = get().threadRuntimeStatus[activeThreadId];
          if (current === "completed") get().clearThreadStatus(activeThreadId);
        }, 5000);

        // Update thread title from first user message if it's still "New Thread"
        const thread = get().threads.find((t) => t.id === activeThreadId);
        if (thread && thread.title === "New Thread") {
          const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
          get().renameThread(activeThreadId, title);
        }

        // Refresh thread list to get updated timestamps
        get().loadThreads();
      } else {
        set({
          isStreaming: false,
          streamingText: null,
          streamingToolCalls: [],
          streamingParts: [],
          currentSessionId: null,
          abortController: null,
          threadRuntimeStatus: {
            ...get().threadRuntimeStatus,
            [activeThreadId]: "completed",
          },
        });

        // Auto-clear completed status after 5s
        setTimeout(() => {
          const current = get().threadRuntimeStatus[activeThreadId];
          if (current === "completed") get().clearThreadStatus(activeThreadId);
        }, 5000);
      }
    }
  },

  stopStreaming: () => {
    const { abortController, currentSessionId, activeThreadId, threadRuntimeStatus } = get();
    if (abortController) {
      abortController.abort();
    }
    if (currentSessionId) {
      stopAgent(currentSessionId).catch(() => {});
    }
    set({
      isStreaming: false,
      streamingText: null,
      streamingToolCalls: [],
      streamingParts: [],
      currentSessionId: null,
      abortController: null,
      ...(activeThreadId
        ? {
            threadRuntimeStatus: {
              ...threadRuntimeStatus,
              [activeThreadId]: "completed",
            },
          }
        : {}),
    });

    // Auto-clear completed status after 5s
    if (activeThreadId) {
      setTimeout(() => {
        const current = get().threadRuntimeStatus[activeThreadId];
        if (current === "completed") get().clearThreadStatus(activeThreadId);
      }, 5000);
    }
  },

  deleteThread: async (id) => {
    try {
      await apiDeleteThread(id);
      set((s) => {
        const threads = s.threads.filter((t) => t.id !== id);
        const messages = { ...s.messages };
        const threadRuntimeStatus = { ...s.threadRuntimeStatus };
        delete messages[id];
        delete threadRuntimeStatus[id];
        return {
          threads,
          messages,
          threadRuntimeStatus,
          activeThreadId: s.activeThreadId === id ? (threads[0]?.id || null) : s.activeThreadId,
        };
      });
    } catch {
      // Failed
    }
  },

  renameThread: async (id, title) => {
    try {
      const updated = await apiUpdateThread(id, { title });
      set((s) => ({
        threads: s.threads.map((t) => (t.id === id ? updated : t)),
      }));
    } catch {
      // Failed
    }
  },

  clearProjectThreads: async (projectId) => {
    try {
      await apiClearProjectThreads(projectId);
      set((s) => {
        const removedIds = s.threads.filter((t) => t.projectId === projectId).map((t) => t.id);
        const messages = { ...s.messages };
        const threadRuntimeStatus = { ...s.threadRuntimeStatus };
        for (const id of removedIds) delete messages[id];
        for (const id of removedIds) delete threadRuntimeStatus[id];
        const threads = s.threads.filter((t) => t.projectId !== projectId);
        return {
          threads,
          messages,
          threadRuntimeStatus,
          activeThreadId: removedIds.includes(s.activeThreadId || '') ? (threads[0]?.id || null) : s.activeThreadId,
        };
      });
    } catch {
      // Failed
    }
  },
}));
