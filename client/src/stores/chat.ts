import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Message, Thread } from "@/types";
import { mockThreads } from "@/mocks/threads";
import { mockMessages, mockStreamText } from "@/mocks/messages";

interface ChatStore {
  threads: Thread[];
  activeThreadId: string | null;
  messages: Record<string, Message[]>;
  streamingText: string | null;
  isStreaming: boolean;
  setActiveThread: (id: string) => void;
  createThread: (workspaceId: string) => void;
  sendMessage: (content: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  threads: mockThreads,
  activeThreadId: "t-4",
  messages: mockMessages,
  streamingText: null,
  isStreaming: false,

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

  sendMessage: (content) => {
    const { activeThreadId } = get();
    if (!activeThreadId) return;

    const userMsg: Message = {
      id: `m-${nanoid(6)}`,
      threadId: activeThreadId,
      role: "user",
      content,
      timestamp: "just now",
    };

    set((s) => ({
      messages: {
        ...s.messages,
        [activeThreadId]: [...(s.messages[activeThreadId] || []), userMsg],
      },
    }));

    // Simulate streaming
    set({ isStreaming: true, streamingText: "" });
    const chars = mockStreamText.split("");
    let i = 0;
    const iv = setInterval(() => {
      if (i >= chars.length) {
        clearInterval(iv);
        const aiMsg: Message = {
          id: `m-${nanoid(6)}`,
          threadId: activeThreadId,
          role: "assistant",
          content: mockStreamText,
          timestamp: "just now",
        };
        set((s) => ({
          isStreaming: false,
          streamingText: null,
          messages: {
            ...s.messages,
            [activeThreadId]: [...(s.messages[activeThreadId] || []), aiMsg],
          },
        }));
        return;
      }
      set((s) => ({ streamingText: (s.streamingText || "") + chars[i] }));
      i++;
    }, 15);
  },
}));
