import type { Message } from "@/types";

export interface ClaudeSlashContext {
  input: string;
  currentModelId: string;
  availableModelIds: string[];
  currentPermissionMode: string;
  availablePermissionModes: string[];
  threadMessages: Message[];
}

export interface ClaudeSlashResult {
  /** Markdown response to display */
  response: string;
  /** Clear thread messages (for /compact, /clear) */
  clearThread?: boolean;
  /** Change active model */
  nextModelId?: string;
  /** Change permission mode */
  nextPermissionMode?: string;
  /** If true, do NOT handle locally — forward to agent as a regular prompt */
  forwardToAgent?: boolean;
}

/**
 * Commands that should be rewritten as regular prompts and sent to the agent.
 * Key = command name, value = static prompt string or function(argument) → prompt.
 */
const AGENT_FORWARDED: Record<string, string | ((arg: string) => string)> = {
  review: "Please review the code in the current working directory.",
  init: "Please initialize a CLAUDE.md file for this project.",
  memory: "Please help me view and edit the CLAUDE.md memory file.",
  search: (q) => q ? `Search the codebase for: ${q}` : "Search the codebase.",
  diff: "Show me the recent code changes (git diff).",
  "pr-comments": "Show the PR review comments for the current branch.",
  undo: "Undo the last file changes you made.",
  "add-dir": (p) => p ? `Add the directory ${p} to context and explore it.` : "Add a directory to context.",
};

/** CLI-only commands — show a message directing to the terminal */
const CLI_ONLY = new Set(["login", "logout", "doctor", "bug", "terminal", "vim", "theme", "mcp", "allowed-tools", "status"]);

export function handleClaudeSlashCommand(ctx: ClaudeSlashContext): ClaudeSlashResult {
  const normalizedInput = ctx.input.trim();
  const parse = normalizedInput.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
  const command = parse?.[1]?.toLowerCase() || "";
  const argument = (parse?.[2] || "").trim();

  // Commands forwarded to agent as regular prompts
  const forwarded = AGENT_FORWARDED[command];
  if (forwarded) {
    const prompt = typeof forwarded === "function" ? forwarded(argument) : forwarded;
    return { response: prompt, forwardToAgent: true };
  }

  if (command === "compact" || command === "clear") {
    return {
      response:
        command === "compact"
          ? "Conversation compacted (local thread cleared)."
          : "Conversation cleared.",
      clearThread: true,
    };
  }

  if (command === "usage" || command === "cost") {
    const assistantMsgs = ctx.threadMessages.filter((m) => m.role === "assistant");
    const lastMsg = assistantMsgs[assistantMsgs.length - 1];
    const totalCost = assistantMsgs.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalDuration = assistantMsgs.reduce((sum, m) => sum + (m.duration || 0), 0);

    if (assistantMsgs.length === 0) {
      return { response: "No usage data yet — send a message first." };
    }

    const lines: string[] = [];
    if (command === "usage") {
      lines.push("**Thread usage:**");
      lines.push(`- Messages: ${assistantMsgs.length}`);
      if (totalCost > 0) lines.push(`- Total cost: $${totalCost.toFixed(4)}`);
      if (totalDuration > 0) lines.push(`- Total duration: ${(totalDuration / 1000).toFixed(1)}s`);
      if (lastMsg?.cost) lines.push(`- Last turn cost: $${lastMsg.cost.toFixed(4)}`);
      if (lastMsg?.duration) lines.push(`- Last turn duration: ${(lastMsg.duration / 1000).toFixed(1)}s`);
    } else {
      lines.push(`**Total cost:** $${totalCost.toFixed(4)}`);
      if (totalDuration > 0) lines.push(`**Total duration:** ${(totalDuration / 1000).toFixed(1)}s`);
    }
    return { response: lines.join("\n") };
  }

  if (command === "model") {
    if (!argument) {
      return { response: `Current model: \`${ctx.currentModelId}\`` };
    }
    if (!ctx.availableModelIds.includes(argument)) {
      return {
        response: `Unknown model \`${argument}\`. Available: ${ctx.availableModelIds.map((m) => `\`${m}\``).join(", ")}`,
      };
    }
    return {
      response: `Model set to \`${argument}\`.`,
      nextModelId: argument,
    };
  }

  if (command === "permissions") {
    if (!argument) {
      return { response: `Current permission mode: \`${ctx.currentPermissionMode}\`` };
    }
    if (!ctx.availablePermissionModes.includes(argument)) {
      return {
        response: `Invalid mode \`${argument}\`. Available: ${ctx.availablePermissionModes.map((m) => `\`${m}\``).join(", ")}`,
      };
    }
    return {
      response: `Permission mode set to \`${argument}\`.`,
      nextPermissionMode: argument,
    };
  }

  if (command === "config") {
    return { response: "Open **Settings** (gear icon) to edit configuration." };
  }

  if (CLI_ONLY.has(command)) {
    return { response: `\`/${command}\` is only available in the Claude Code CLI terminal.` };
  }

  if (command === "help") {
    return {
      response: [
        "**Claude Code slash commands:**",
        "",
        "| Command | Description |",
        "|---------|-------------|",
        "| `/help` | Show this help |",
        "| `/compact` | Clear conversation context |",
        "| `/clear` | Clear conversation |",
        "| `/review` | Request a code review |",
        "| `/usage` | Show token usage info |",
        "| `/cost` | Show cost info |",
        "| `/model [name]` | Show or change model |",
        "| `/permissions [mode]` | Show or change permission mode |",
        "| `/init` | Initialize a CLAUDE.md file |",
        "| `/memory` | Edit CLAUDE.md |",
        "| `/search <query>` | Search the codebase |",
        "| `/diff` | Show recent code changes |",
        "| `/undo` | Undo last file changes |",
        "| `/pr-comments` | Show PR review comments |",
        "| `/add-dir <path>` | Add directory to context |",
        "| `/config` | Edit config (opens settings) |",
        "",
        "*CLI-only:* `/login`, `/logout`, `/doctor`, `/bug`, `/terminal`, `/vim`, `/theme`, `/mcp`, `/status`, `/allowed-tools`",
        "",
        "Unrecognized commands are forwarded to the agent as prompts.",
      ].join("\n"),
    };
  }

  // Unknown command — forward to agent as a regular prompt instead of erroring
  return {
    response: argument ? `/${command} ${argument}` : `/${command}`,
    forwardToAgent: true,
  };
}
