import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Square, ChevronDown, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chat';
import { useUIStore } from '@/stores/ui';
import { useSettingsStore } from '@/stores/settings';
import { getModelsForMode } from '@/config/models';
import {
  getPermissionModesForMode,
  getPermissionModeLabel,
  type SlashCommand,
} from '@/config/commands';
import { SlashCommandDropdown } from './SlashCommandDropdown';

export function ChatInput() {
  const [text, setText] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showPermDropdown, setShowPermDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const { sendMessage, isStreaming, stopStreaming } = useChatStore();
  const {
    activeModelId, setActiveModelId,
    activeMode, setActiveMode,
    slashCommands, permissionMode, setPermissionMode,
    loadSlashCommands,
  } = useUIStore();
  const { setActiveClaudeModel, setActiveCodexModel } = useSettingsStore();

  const availableModels = getModelsForMode(activeMode);
  const activeModel = availableModels.find((m) => m.id === activeModelId);
  const permModes = getPermissionModesForMode(activeMode);
  const permLabel = getPermissionModeLabel(permissionMode);

  // Load slash commands on mount and mode change
  useEffect(() => {
    const provider = activeMode === 'codex' ? 'codex' as const : 'claude' as const;
    loadSlashCommands(provider);
  }, [activeMode, loadSlashCommands]);

  // Filter commands for slash menu
  const filteredCommands = slashCommands.filter(c =>
    c.name.toLowerCase().startsWith(slashFilter.toLowerCase())
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && attachedFiles.length === 0) return;
    if (isStreaming) return;

    let finalPrompt = trimmed;
    if (attachedFiles.length > 0) {
      const fileList = attachedFiles.map(f => `- ${f}`).join('\n');
      finalPrompt = trimmed
        ? `I'm sharing these files with you:\n${fileList}\n\n${trimmed}`
        : `I'm sharing these files with you:\n${fileList}\n\nPlease examine these files.`;
    }

    sendMessage(finalPrompt);
    setText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, isStreaming, sendMessage, attachedFiles]);

  // Detect slash command trigger
  const updateSlashMenu = useCallback((value: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);

    // Find if we're typing a / command at the start of a line
    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline + 1;
    const lineText = textBeforeCursor.slice(lineStart);

    if (lineText.startsWith('/') && !lineText.includes(' ')) {
      const filter = lineText.slice(1);
      setSlashFilter(filter);
      setSlashSelectedIndex(0);
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    updateSlashMenu(value);
  };

  const handleSlashSelect = useCallback((command: SlashCommand) => {
    const el = textareaRef.current;
    if (!el) return;

    const cursorPos = el.selectionStart;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastNewline = textBeforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline + 1;

    // Replace from lineStart to cursor with the command
    const newText = text.slice(0, lineStart) + `/${command.name} ` + text.slice(cursorPos);
    setText(newText);
    setShowSlashMenu(false);

    // Focus and set cursor position
    requestAnimationFrame(() => {
      el.focus();
      const newCursorPos = lineStart + command.name.length + 2; // "/" + name + " "
      el.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Slash menu navigation
    if (showSlashMenu && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashSelectedIndex(i => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSlashSelect(filteredCommands[slashSelectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
        return;
      }
    }

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
    if (activeMode === 'claudeCode') {
      setActiveClaudeModel(modelId);
    } else if (activeMode === 'codex') {
      setActiveCodexModel(modelId);
    }
    setShowModelDropdown(false);
  };

  // File attachment handlers
  const handleFileAttach = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ multiple: true, title: 'Attach files' });
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        setAttachedFiles(prev => [...new Set([...prev, ...paths])]);
      }
    } catch {
      // Fallback to HTML file input (browser mode)
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const paths = Array.from(files).map(f => f.name);
    setAttachedFiles(prev => [...new Set([...prev, ...paths])]);
    e.target.value = '';
  };

  const removeFile = (path: string) => {
    setAttachedFiles(prev => prev.filter(p => p !== path));
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const paths = files
      .map(f => (f as File & { path?: string }).path || f.name)
      .filter(Boolean);
    if (paths.length > 0) {
      setAttachedFiles(prev => [...new Set([...prev, ...paths])]);
    }
  };

  const modes: Array<{ value: 'claudeCode' | 'codex' | 'woAgent'; label: string; disabled?: boolean }> = [
    { value: 'claudeCode', label: 'ClaudeCode' },
    { value: 'codex', label: 'Codex' },
    { value: 'woAgent', label: 'WoAgent', disabled: true },
  ];

  const hasContent = text.trim() || attachedFiles.length > 0;

  return (
    <div className="border-t border-border p-3">
      {/* Main input container */}
      <div
        className={cn(
          'relative rounded-xl border bg-muted/30 focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-colors',
          isDragOver ? 'border-primary/50 bg-primary/5' : 'border-border'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Attached files */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2">
            {attachedFiles.map((filePath) => (
              <div
                key={filePath}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground max-w-[200px]"
              >
                <Paperclip size={10} className="shrink-0" />
                <span className="truncate" title={filePath}>
                  {filePath.split('/').pop() || filePath}
                </span>
                <button
                  onClick={() => removeFile(filePath)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground shrink-0"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drag overlay hint */}
        {isDragOver && (
          <div className="absolute inset-0 rounded-xl bg-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-sm text-primary/70">Drop files here</span>
          </div>
        )}

        {/* Slash command dropdown */}
        <div className="relative">
          <SlashCommandDropdown
            commands={slashCommands}
            filter={slashFilter}
            selectedIndex={slashSelectedIndex}
            onSelect={handleSlashSelect}
            visible={showSlashMenu}
          />
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message... (/ for commands, Shift+Enter for newline)"
          rows={1}
          className="w-full px-4 pt-3 pb-10 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none"
        />

        {/* Hidden file input for browser fallback */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Bottom bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Attach file button */}
            <button
              onClick={handleFileAttach}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Attach files"
            >
              <Paperclip size={14} />
            </button>

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

            {/* Permission Mode Badge */}
            <div className="relative">
              <button
                onClick={() => setShowPermDropdown(!showPermDropdown)}
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors',
                  permissionMode === 'plan'
                    ? 'bg-blue-500/10 text-blue-400'
                    : permissionMode === 'bypassPermissions' || permissionMode === 'auto-edit'
                      ? 'bg-green-500/10 text-green-400'
                      : permissionMode === 'default' || permissionMode === 'ask'
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-muted text-muted-foreground'
                )}
              >
                <span>{permLabel}</span>
                <ChevronDown size={8} />
              </button>
              {showPermDropdown && (
                <div className="absolute bottom-full left-0 mb-1 w-36 rounded-lg border border-border bg-popover shadow-lg py-1 z-50">
                  {permModes.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => {
                        setPermissionMode(m.value);
                        setShowPermDropdown(false);
                      }}
                      className={cn(
                        'w-full px-3 py-1.5 text-xs text-left hover:bg-muted transition-colors',
                        m.value === permissionMode ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
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
              disabled={!hasContent}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                hasContent
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
