import { useEffect, useRef } from 'react';
import { PanelLeft, PanelRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat';
import { useUIStore } from '@/stores/ui';
import { usePreviewStore } from '@/stores/preview';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

export function ChatPanel() {
  const { activeThreadId, messages, threads, streamingText, isStreaming } = useChatStore();
  const { sidebarOpen, toggleSidebar, previewOpen, togglePreview } = useUIStore();
  const ingestMessage = usePreviewStore((s) => s.ingestMessage);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIngestedIdRef = useRef<string | null>(null);

  const currentThread = threads.find((t) => t.id === activeThreadId);
  const currentMessages = activeThreadId ? messages[activeThreadId] || [] : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentMessages, streamingText]);

  useEffect(() => {
    const latest = currentMessages[currentMessages.length - 1];
    if (!latest) return;
    if (lastIngestedIdRef.current === latest.id) return;
    lastIngestedIdRef.current = latest.id;
    ingestMessage(latest);
  }, [currentMessages, ingestMessage]);

  useEffect(() => {
    lastIngestedIdRef.current = null;
  }, [activeThreadId]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Chat Header */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <PanelLeft size={16} />
          </button>
          {currentThread && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{currentThread.title}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                currentThread.mode === 'claudeCode' ? 'bg-primary/10 text-primary' :
                'bg-orange-500/10 text-orange-400'
              )}>
                {currentThread.mode === 'claudeCode' ? 'Claude' : 'Codex'}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={togglePreview}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            previewOpen
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <PanelRight size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.length === 0 && !isStreaming && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-1">Start a conversation</p>
              <p className="text-xs">Type a message below to begin</p>
            </div>
          </div>
        )}
        {currentMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isStreaming && streamingText !== null && (
          <MessageBubble
            message={{
              id: 'streaming',
              threadId: activeThreadId || '',
              role: 'assistant',
              content: streamingText,
              timestamp: '',
            }}
            isStreaming
          />
        )}
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  );
}
