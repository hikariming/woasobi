import type { AIModel } from "@/types";

export const mockModels: AIModel[] = [
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic" },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "Anthropic" },
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", provider: "OpenAI" },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI" },
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek" },
];
