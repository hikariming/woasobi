import { useState, useRef, useCallback } from 'react';
import { Send, Square, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { getModelsForMode } from '@/config/models';

export function ChatInput() {
  const [text, setText] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming, stopStreaming } = useChatStore();
  const { activeModelId, setActiveModelId, activeMode, setActiveMode } = useUIStore();
  const { setActiveClaudeModel, setActiveCodexModel } = useSettingsStore();

  const availableModels = getModelsForMode(activeMode);
  const activeModel = availableModels.find((m) => m.id === activeModelId);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  const handleModelSelect = (modelId: string) => {
    setActiveModelId(modelId);
    // Also persist to settings store
    if (activeMode === 'claudeCode') {
      setActiveClaudeModel(modelId);
    } else if (activeMode === 'codex') {
      setActiveCodexModel(modelId);
    }
    setShowModelDropdown(false);
  };

  const modes: Array<{ value: 'claudeCode' | 'codex' | 'woAgent'; label: string; disabled?: boolean }> = [
    { value: 'claudeCode', label: 'ClaudeCode' },
    { value: 'codex', label: 'Codex' },
    { value: 'woAgent', label: 'WoAgent', disabled: true },
  ];

  return (
    <div className="border-t border-border p-3">
      {/* Textarea */}
      <div className="relative rounded-xl border border-border bg-muted/30 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message... (Shift+Enter for newline)"
          rows={1}
          className="w-full px-4 pt-3 pb-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
        />

        {/* Bottom bar inside textarea */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span>{activeModel?.name || 'Select model'}</span>
                <ChevronDown size={10} />
              </button>
              {showModelDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
                  {availableModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleModelSelect(m.id)}
                      className={cn(
                        'w-full px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors flex items-center justify-between',
                        m.id === activeModelId ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      <span>{m.name}</span>
                      <span className="text-[10px] text-muted-foreground">{m.provider}</span>
                    </button>
                  ))}
                  {availableModels.length === 0 && (
                    <div className="px-3 py-1.5 text-xs text-muted-foreground italic">No models available</div>
                  )}
                </div>
              )}
            </div>

            {/* Mode Selector */}
            <div className="flex items-center rounded-md bg-muted/50 overflow-hidden">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => !m.disabled && setActiveMode(m.value)}
                  disabled={m.disabled}
                  className={cn(
                    'px-2 py-1 text-[11px] transition-colors',
                    m.disabled
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : activeMode === m.value
                        ? 'bg-primary/20 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              title="Stop generation"
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                text.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
