import { useState, useEffect, useRef } from 'react';
import { Terminal, GitBranch, Clock, Moon, Sun, ChevronDown, Circle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';
import { usePreviewStore } from '@/stores/preview';

export function StatusBar() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const { backendConnected, checkBackendHealth, setPreviewTab, togglePreview, previewOpen } = useUIStore();
  const {
    currentBranch,
    branches,
    branchesLoading,
    activeProjectId,
    switchBranch,
    loadBranches,
  } = usePreviewStore();

  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [branchError, setBranchError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check backend health on mount and periodically
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!branchDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
        setBranchError(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [branchDropdownOpen]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleBranchClick = () => {
    if (activeProjectId) {
      loadBranches(activeProjectId);
    }
    setBranchDropdownOpen((v) => !v);
    setBranchError(null);
  };

  const handleSwitchBranch = async (branch: string) => {
    if (branch === currentBranch) {
      setBranchDropdownOpen(false);
      return;
    }
    setSwitchingTo(branch);
    setBranchError(null);
    const result = await switchBranch(branch);
    setSwitchingTo(null);
    if (result.ok) {
      setBranchDropdownOpen(false);
    } else if (result.error) {
      setBranchError(result.error);
    }
  };

  const handleTerminalClick = () => {
    if (!previewOpen) togglePreview();
    setPreviewTab('terminal');
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

        <button
          onClick={handleTerminalClick}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Terminal size={12} />
          <span>Terminal</span>
        </button>

        {/* Branch Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleBranchClick}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <GitBranch size={12} />
            <span>{currentBranch}</span>
            {branchesLoading ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <ChevronDown size={10} />
            )}
          </button>

          {branchDropdownOpen && (
            <div className="absolute bottom-full left-0 mb-1 w-52 rounded-md border border-border bg-popover shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              {branches.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">No branches found</div>
              )}
              {branches.map((branch) => (
                <button
                  key={branch}
                  onClick={() => handleSwitchBranch(branch)}
                  disabled={switchingTo !== null}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-muted/50 transition-colors",
                    branch === currentBranch ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {branch === currentBranch ? (
                    <Check size={11} className="text-green-400 shrink-0" />
                  ) : switchingTo === branch ? (
                    <Loader2 size={11} className="animate-spin shrink-0" />
                  ) : (
                    <span className="w-[11px] shrink-0" />
                  )}
                  <span className="truncate">{branch}</span>
                </button>
              ))}
              {branchError && (
                <div className="px-3 py-1.5 text-[10px] text-red-400 border-t border-border mt-1">
                  {branchError}
                </div>
              )}
            </div>
          )}
        </div>
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
