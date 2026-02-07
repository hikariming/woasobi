import { useState } from 'react';
import {
  X, User, Cpu, Settings, Plug, FolderOpen, Wrench, Info,
  Moon, Sun, Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui';

type SettingsTab = 'account' | 'models' | 'general' | 'mcp' | 'workspace' | 'skills' | 'about';

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType }> = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'models', label: 'Models', icon: Cpu },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'mcp', label: 'MCP Servers', icon: Plug },
  { id: 'workspace', label: 'Workspace', icon: FolderOpen },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'about', label: 'About', icon: Info },
];

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen } = useUIStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-[700px] max-w-[90vw] h-[500px] max-h-[80vh] bg-background border border-border rounded-xl shadow-2xl flex overflow-hidden">
        {/* Left navigation */}
        <div className="w-[180px] border-r border-border bg-muted/30 p-2 space-y-0.5">
          <div className="px-3 py-2 text-sm font-semibold text-foreground">Settings</div>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors',
                activeTab === tab.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'account' && <AccountTab />}
            {activeTab === 'models' && <ModelsTab />}
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'mcp' && <MCPTab />}
            {activeTab === 'workspace' && <WorkspaceTab />}
            {activeTab === 'skills' && <SkillsTab />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function AccountTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User size={24} className="text-primary" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground">Demo User</div>
          <div className="text-xs text-muted-foreground">demo@woasobi.dev</div>
        </div>
      </div>
      <SettingRow label="Plan" description="Current subscription plan">
        <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">Pro</span>
      </SettingRow>
      <SettingRow label="Usage" description="Monthly token usage">
        <span className="text-xs text-muted-foreground">124.5K / 500K tokens</span>
      </SettingRow>
    </div>
  );
}

function ModelsTab() {
  const providers = [
    { name: 'Anthropic', key: 'sk-ant-***...8f3', models: ['Claude Opus 4.6', 'Claude Sonnet 4.5', 'Claude Haiku 4.5'], active: true },
    { name: 'OpenAI', key: 'sk-proj-***...x2k', models: ['GPT-5.3 Codex', 'GPT-4.1'], active: true },
    { name: 'DeepSeek', key: '', models: ['DeepSeek V3'], active: false },
  ];

  return (
    <div className="space-y-4">
      {providers.map((p) => (
        <div key={p.name} className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{p.name}</span>
            <div className={cn(
              'w-2 h-2 rounded-full',
              p.active ? 'bg-green-400' : 'bg-muted-foreground/30'
            )} />
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            API Key: {p.key || <span className="italic">Not configured</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            {p.models.map((m) => (
              <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{m}</span>
            ))}
          </div>
        </div>
      ))}
      <button className="text-xs text-primary hover:underline">+ Add Provider</button>
    </div>
  );
}

function GeneralTab() {
  return (
    <div>
      <SettingRow label="Theme" description="Choose your preferred appearance">
        <ThemeSelector />
      </SettingRow>
      <SettingRow label="Language" description="Interface language">
        <select className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-foreground">
          <option>English</option>
          <option>中文</option>
        </select>
      </SettingRow>
      <SettingRow label="Font Size" description="Editor and chat font size">
        <select className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-foreground">
          <option>12px</option>
          <option>13px</option>
          <option selected>14px</option>
          <option>15px</option>
          <option>16px</option>
        </select>
      </SettingRow>
      <SettingRow label="Send with Enter" description="Press Enter to send, Shift+Enter for newline">
        <ToggleSwitch defaultChecked />
      </SettingRow>
    </div>
  );
}

function ThemeSelector() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  const handleChange = (t: 'light' | 'dark' | 'system') => {
    setTheme(t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-md bg-muted/50 overflow-hidden">
      {[
        { value: 'light' as const, icon: Sun },
        { value: 'dark' as const, icon: Moon },
        { value: 'system' as const, icon: Monitor },
      ].map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => handleChange(value)}
          className={cn(
            'p-1.5 transition-colors',
            theme === value
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={cn(
        'w-8 h-[18px] rounded-full transition-colors relative',
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      )}
    >
      <div className={cn(
        'w-3.5 h-3.5 rounded-full bg-white absolute top-[2px] transition-transform',
        checked ? 'translate-x-[14px]' : 'translate-x-[2px]'
      )} />
    </button>
  );
}

function MCPTab() {
  const servers = [
    { name: 'filesystem', status: 'connected', tools: 4 },
    { name: 'github', status: 'connected', tools: 8 },
    { name: 'database', status: 'disconnected', tools: 0 },
  ];

  return (
    <div className="space-y-3">
      {servers.map((s) => (
        <div key={s.name} className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Plug size={14} className="text-muted-foreground" />
            <span className="text-sm text-foreground">{s.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{s.tools} tools</span>
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              s.status === 'connected' ? 'bg-green-400' : 'bg-red-400'
            )} />
          </div>
        </div>
      ))}
      <button className="text-xs text-primary hover:underline">+ Add MCP Server</button>
    </div>
  );
}

function WorkspaceTab() {
  return (
    <div>
      <SettingRow label="Default Workspace" description="Where new threads are created">
        <select className="text-xs bg-muted border border-border rounded-md px-2 py-1 text-foreground">
          <option>woasobi</option>
          <option>aipt4</option>
          <option>yizhi5</option>
        </select>
      </SettingRow>
      <SettingRow label="Auto-detect Git" description="Automatically detect Git repositories">
        <ToggleSwitch defaultChecked />
      </SettingRow>
    </div>
  );
}

function SkillsTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Manage your custom skills and prompt templates.</p>
      {['Code Generation', 'Code Review', 'Bug Fix', 'Refactor'].map((s) => (
        <div key={s} className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5">
          <span className="text-sm text-foreground">{s}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">built-in</span>
        </div>
      ))}
      <button className="text-xs text-primary hover:underline">+ Create Custom Skill</button>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="text-lg font-semibold text-foreground mb-1">WoaSobi AI</div>
        <div className="text-xs text-muted-foreground">Version 0.1.0 (Prototype)</div>
      </div>
      <SettingRow label="Built with" description="Core technologies">
        <span className="text-xs text-muted-foreground">React 19 + Vite 7 + Tailwind 4</span>
      </SettingRow>
      <SettingRow label="License" description="Software license">
        <span className="text-xs text-muted-foreground">MIT</span>
      </SettingRow>
    </div>
  );
}
