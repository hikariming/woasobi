export interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

export const claudeModels: ModelOption[] = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
];

export const codexModels: ModelOption[] = [
  { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex', provider: 'OpenAI' },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
];

export function getModelsForMode(mode: 'claudeCode' | 'codex' | 'woAgent'): ModelOption[] {
  switch (mode) {
    case 'claudeCode':
      return claudeModels;
    case 'codex':
      return codexModels;
    case 'woAgent':
      return [];
  }
}

export function getDefaultModelForMode(mode: 'claudeCode' | 'codex' | 'woAgent'): string {
  switch (mode) {
    case 'claudeCode':
      return 'claude-sonnet-4-5';
    case 'codex':
      return 'gpt-5.3-codex';
    case 'woAgent':
      return '';
  }
}
