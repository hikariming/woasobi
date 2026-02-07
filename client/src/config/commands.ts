export interface SlashCommand {
  name: string;
  description: string;
  argumentHint: string;
}

export const DEFAULT_CLAUDE_COMMANDS: SlashCommand[] = [
  { name: 'compact', description: 'Compact conversation context', argumentHint: '' },
  { name: 'review', description: 'Code review', argumentHint: '' },
  { name: 'init', description: 'Initialize a CLAUDE.md file', argumentHint: '' },
  { name: 'login', description: 'Log in to your account', argumentHint: '' },
  { name: 'logout', description: 'Log out', argumentHint: '' },
  { name: 'doctor', description: 'Diagnose issues', argumentHint: '' },
  { name: 'memory', description: 'Edit CLAUDE.md', argumentHint: '' },
  { name: 'config', description: 'Edit config', argumentHint: '' },
  { name: 'cost', description: 'Show cost information', argumentHint: '' },
  { name: 'permissions', description: 'View and manage permissions', argumentHint: '' },
];

export const CODEX_COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'Show available commands', argumentHint: '' },
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
