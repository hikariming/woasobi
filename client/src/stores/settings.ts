import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  // Anthropic (Claude)
  anthropicApiKey: string;
  anthropicBaseUrl: string;
  activeClaudeModel: string;

  // OpenAI (Codex)
  openaiApiKey: string;
  openaiBaseUrl: string;
  activeCodexModel: string;

  // Actions
  setAnthropicApiKey: (key: string) => void;
  setAnthropicBaseUrl: (url: string) => void;
  setActiveClaudeModel: (model: string) => void;
  setOpenaiApiKey: (key: string) => void;
  setOpenaiBaseUrl: (url: string) => void;
  setActiveCodexModel: (model: string) => void;

  // Helper: get model config for current mode
  getModelConfig: (mode: 'claudeCode' | 'codex' | 'woAgent') => {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  };
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      anthropicApiKey: '',
      anthropicBaseUrl: '',
      activeClaudeModel: 'claude-sonnet-4-5',

      openaiApiKey: '',
      openaiBaseUrl: '',
      activeCodexModel: 'gpt-5.3-codex',

      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),
      setAnthropicBaseUrl: (url) => set({ anthropicBaseUrl: url }),
      setActiveClaudeModel: (model) => set({ activeClaudeModel: model }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      setOpenaiBaseUrl: (url) => set({ openaiBaseUrl: url }),
      setActiveCodexModel: (model) => set({ activeCodexModel: model }),

      getModelConfig: (mode) => {
        const state = get();
        if (mode === 'claudeCode') {
          return {
            apiKey: state.anthropicApiKey || undefined,
            baseUrl: state.anthropicBaseUrl || undefined,
            model: state.activeClaudeModel || undefined,
          };
        }
        if (mode === 'codex') {
          return {
            apiKey: state.openaiApiKey || undefined,
            baseUrl: state.openaiBaseUrl || undefined,
            model: state.activeCodexModel || undefined,
          };
        }
        return {};
      },
    }),
    {
      name: 'woasobi-settings',
    }
  )
);
