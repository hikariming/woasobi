export interface SlashCommand {
  name: string;
  description: string;
  argumentHint: string;
}

export const DEFAULT_CLAUDE_COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'Show available commands', argumentHint: '' },
  { name: 'compact', description: 'Compact conversation context', argumentHint: '[instructions]' },
  { name: 'clear', description: 'Clear conversation history', argumentHint: '' },
  { name: 'review', description: 'Code review', argumentHint: '' },
  { name: 'usage', description: 'Show token usage information', argumentHint: '' },
  { name: 'cost', description: 'Show cost information', argumentHint: '' },
  { name: 'model', description: 'Show or change the model', argumentHint: '[model-name]' },
  { name: 'permissions', description: 'View and manage permissions', argumentHint: '[mode]' },
  { name: 'init', description: 'Initialize a CLAUDE.md file', argumentHint: '' },
  { name: 'memory', description: 'Edit CLAUDE.md', argumentHint: '' },
  { name: 'config', description: 'Edit config', argumentHint: '' },
  { name: 'login', description: 'Log in to your account', argumentHint: '' },
  { name: 'logout', description: 'Log out', argumentHint: '' },
  { name: 'doctor', description: 'Diagnose issues', argumentHint: '' },
  { name: 'bug', description: 'Report a bug', argumentHint: '' },
  { name: 'status', description: 'Show current session status', argumentHint: '' },
  { name: 'mcp', description: 'Show MCP server status', argumentHint: '' },
  { name: 'allowed-tools', description: 'Manage allowed tools', argumentHint: '' },
  { name: 'terminal', description: 'Open a terminal', argumentHint: '' },
  { name: 'vim', description: 'Toggle vim keybindings', argumentHint: '' },
  { name: 'theme', description: 'Change the theme', argumentHint: '[theme-name]' },
  { name: 'undo', description: 'Undo last file changes', argumentHint: '' },
  { name: 'diff', description: 'Show recent code changes', argumentHint: '' },
  { name: 'pr-comments', description: 'Show PR review comments', argumentHint: '' },
  { name: 'search', description: 'Search the codebase', argumentHint: '<query>' },
  { name: 'add-dir', description: 'Add a directory to context', argumentHint: '<path>' },
];

/** Description lookup for merging with dynamically discovered command names */
export const CLAUDE_COMMAND_DESCRIPTIONS: Record<string, { description: string; argumentHint: string }> = {};
for (const cmd of DEFAULT_CLAUDE_COMMANDS) {
  CLAUDE_COMMAND_DESCRIPTIONS[cmd.name] = { description: cmd.description, argumentHint: cmd.argumentHint };
}

export const CODEX_COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'Show available commands', argumentHint: '' },
  { name: 'usage', description: 'Show token usage from latest Codex turn', argumentHint: '' },
  { name: 'model', description: 'Change the model', argumentHint: '<model-name>' },
  { name: 'approval', description: 'Change approval mode', argumentHint: '<mode>' },
  { name: 'undo', description: 'Undo last file changes', argumentHint: '' },
  { name: 'clear', description: 'Clear conversation history', argumentHint: '' },
  { name: 'history', description: 'Show conversation history', argumentHint: '' },
  { name: 'compact', description: 'Compact conversation context', argumentHint: '' },
];

export interface PermissionModeOption {
  value: string;
  label: string;
}

export const CLAUDE_PERMISSION_MODES: PermissionModeOption[] = [
  { value: 'bypassPermissions', label: 'Bypass' },
  { value: 'default', label: 'Default' },
  { value: 'acceptEdits', label: 'Accept Edits' },
  { value: 'plan', label: 'Plan' },
];

export const CODEX_PERMISSION_MODES: PermissionModeOption[] = [
  { value: 'auto-edit', label: 'Auto Edit' },
  { value: 'suggest', label: 'Suggest' },
  { value: 'ask', label: 'Ask' },
];

export function getPermissionModesForMode(mode: string): PermissionModeOption[] {
  return mode === 'codex' ? CODEX_PERMISSION_MODES : CLAUDE_PERMISSION_MODES;
}

export function getPermissionModeLabel(value: string): string {
  const all = [...CLAUDE_PERMISSION_MODES, ...CODEX_PERMISSION_MODES];
  return all.find(m => m.value === value)?.label || value;
}

export function getDefaultPermissionMode(mode: string): string {
  return mode === 'codex' ? 'auto-edit' : 'bypassPermissions';
}
