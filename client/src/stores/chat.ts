import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Message, Thread, ToolCall } from "@/types";
import { mockThreads } from "@/mocks/threads";
import { mockMessages } from "@/mocks/messages";
import { sendAgentRequest, parseSSEStream, stopAgent } from "@/lib/api/agent";
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
  setActiveThread: (id: string) => void;
  createThread: (workspaceId: string) => void;
  sendMessage: (content: string) => void;
  stopStreaming: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: mockThreads,
  activeThreadId: "t-4",
  messages: mockMessages,
  streamingText: null,
  streamingToolCalls: [],
  isStreaming: false,
  currentSessionId: null,
  abortController: null,

  setActiveThread: (id) => set({ activeThreadId: id }),

  createThread: (workspaceId) => {
    const t: Thread = {
      id: `t-${nanoid(6)}`,
      title: "New Thread",
      workspaceId,
      model: "claude-sonnet-4-5",
      mode: "agent",
      updatedAt: "now",
    };
    set((s) => ({
      threads: [t, ...s.threads],
      activeThreadId: t.id,
      messages: { ...s.messages, [t.id]: [] },
    }));
  },

  sendMessage: async (content) => {
    const { activeThreadId } = get();
    if (!activeThreadId) return;

    // Add user message
    const userMsg: Message = {
      id: `m-${nanoid(6)}`,
      threadId: activeThreadId,
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString(),
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

    // Build conversation history from thread messages
    const threadMsgs = get().messages[activeThreadId] || [];
    const conversation = threadMsgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-20) // Keep last 20 messages max
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
      });

      await parseSSEStream(response, (msg) => {
        switch (msg.type) {
          case "session":
            set({ currentSessionId: msg.sessionId || null });
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
            // Will be handled in finally
            break;
        }
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // User cancelled - just stop
      } else {
        const errorMsg = error instanceof Error ? error.message : String(error);
        fullText += fullText
          ? `\n\n**Connection Error:** ${errorMsg}`
          : `**Connection Error:** ${errorMsg}`;
      }
    } finally {
      // Create final assistant message
      if (fullText) {
        const aiMsg: Message = {
          id: `m-${nanoid(6)}`,
          threadId: activeThreadId,
          role: "assistant",
          content: fullText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: new Date().toLocaleTimeString(),
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
}));
