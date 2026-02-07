import { useState, useEffect } from 'react';
import { Terminal, GitBranch, Clock, Moon, Sun, ChevronDown, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';

export function StatusBar() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const { backendConnected, checkBackendHealth } = useUIStore();

  // Check backend health on mount and periodically
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="h-6 px-2 flex items-center justify-between border-t border-border bg-sidebar text-[11px] text-muted-foreground shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {/* Backend Status */}
        <div
          className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
          onClick={() => checkBackendHealth()}
          title={backendConnected ? 'Backend connected' : 'Backend offline'}
        >
          <Circle
            size={8}
            className={cn(
              'fill-current',
              backendConnected ? 'text-green-400' : 'text-red-400'
            )}
          />
          <span>{backendConnected ? 'API' : 'Offline'}</span>
        </div>

        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Terminal size={12} />
          <span>Terminal</span>
          <ChevronDown size={10} />
        </button>
        <button className="flex items-center gap-1 hover:text-foreground transition-colors">
          <GitBranch size={12} />
          <span>main</span>
          <ChevronDown size={10} />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Clock size={11} />
          <span>124.5K tokens</span>
        </div>
        <button
          onClick={toggleTheme}
          className={cn(
            'p-0.5 rounded hover:text-foreground transition-colors',
            'hover:bg-muted/50'
          )}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
        </button>
      </div>
    </div>
  );
}
