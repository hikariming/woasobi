import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { SlashCommand } from '@/config/commands';

interface Props {
  commands: SlashCommand[];
  filter: string;
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  visible: boolean;
}

export function SlashCommandDropdown({ commands, filter, selectedIndex, onSelect, visible }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = commands.filter(c =>
    c.name.toLowerCase().startsWith(filter.toLowerCase())
  );

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-command-item]');
    const item = items[selectedIndex];
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-1 w-72 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg py-1 z-50 scrollbar-thin"
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.name}
          data-command-item
          onClick={() => onSelect(cmd)}
          className={cn(
            'w-full px-3 py-1.5 text-left flex items-start gap-2 transition-colors',
            i === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
          )}
        >
          <span className="text-xs font-mono font-medium text-primary shrink-0">
            /{cmd.name}
          </span>
          {cmd.description && (
            <span className="text-[11px] text-muted-foreground truncate">
              {cmd.description}
            </span>
          )}
          {cmd.argumentHint && (
            <span className="text-[10px] text-muted-foreground/60 italic shrink-0">
              {cmd.argumentHint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
