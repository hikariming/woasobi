import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Message, Thread, ToolCall } from "@/types";
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

interface ChatStore {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Record<string, Message[]>;
  streamingText: string | null;
  streamingToolCalls: ToolCall[];
  isStreaming: boolean;
  currentSessionId: string | null;
  abortController: AbortController | null;
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
}

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: {},
  streamingText: null,
  streamingToolCalls: [],
  isStreaming: false,
  currentSessionId: null,
  abortController: null,
  threadsLoading: false,
  messagesLoading: false,

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
      currentSessionId: null,
      abortController,
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
    let cost: number | undefined;
    let duration: number | undefined;

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
            if (msg.permissionMode) {
              useUIStore.getState().setPermissionMode(msg.permissionMode);
            }
            break;

          case "text":
            if (msg.content) {
              fullText += msg.content;
              set({ streamingText: fullText });
            }
            break;

          case "tool_use":
            if (msg.name && msg.id) {
              const tc: ToolCall = {
                id: msg.id,
                name: msg.name,
                args: (msg.input as Record<string, unknown>) || {},
              };
              toolCalls.push(tc);
              set({ streamingToolCalls: [...toolCalls] });
            }
            break;

          case "tool_result":
            if (msg.toolUseId) {
              const tc = toolCalls.find((t) => t.id === msg.toolUseId);
              if (tc) {
                tc.output = msg.output;
                set({ streamingToolCalls: [...toolCalls] });
              }
            }
            break;

          case "result":
            cost = msg.cost;
            duration = msg.duration;
            break;

          case "error":
            const errorContent = msg.message || "Unknown error";
            fullText += fullText ? `\n\n**Error:** ${errorContent}` : `**Error:** ${errorContent}`;
            set({ streamingText: fullText });
            break;

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
      // Create final assistant message in local state
      if (fullText) {
        const aiMsg: Message = {
          id: `m-${nanoid(6)}`,
          threadId: activeThreadId,
          role: "assistant",
          content: fullText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: new Date().toISOString(),
          cost,
          duration,
          isError: fullText.includes("**Error:**") || fullText.includes("**Connection Error:**"),
        };

        set((s) => ({
          isStreaming: false,
          streamingText: null,
          streamingToolCalls: [],
          currentSessionId: null,
          abortController: null,
          messages: {
            ...s.messages,
            [activeThreadId]: [
              ...(s.messages[activeThreadId] || []),
              aiMsg,
            ],
          },
        }));

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
          currentSessionId: null,
          abortController: null,
        });
      }
    }
  },

  stopStreaming: () => {
    const { abortController, currentSessionId } = get();
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
      currentSessionId: null,
      abortController: null,
    });
  },

  deleteThread: async (id) => {
    try {
      await apiDeleteThread(id);
      set((s) => {
        const threads = s.threads.filter((t) => t.id !== id);
        const messages = { ...s.messages };
        delete messages[id];
        return {
          threads,
          messages,
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
        for (const id of removedIds) delete messages[id];
        const threads = s.threads.filter((t) => t.projectId !== projectId);
        return {
          threads,
          messages,
          activeThreadId: removedIds.includes(s.activeThreadId || '') ? (threads[0]?.id || null) : s.activeThreadId,
        };
      });
    } catch {
      // Failed
    }
  },
}));
