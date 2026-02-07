export interface CodexUsageSnapshot {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export interface CodexSlashContext {
  input: string;
  currentModelId: string;
  availableModelIds: string[];
  currentApprovalMode: string;
  availableApprovalModes: string[];
  usage?: CodexUsageSnapshot;
  recentUserMessages: string[];
}

export interface CodexSlashResult {
  response: string;
  clearThread?: boolean;
  nextModelId?: string;
  nextApprovalMode?: string;
}

export function handleCodexSlashCommand(ctx: CodexSlashContext): CodexSlashResult {
  const normalizedInput = ctx.input.trim();
  const parse = normalizedInput.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/);
  const rawCommand = parse?.[1]?.toLowerCase() || "";
  const command = rawCommand === "useage" ? "usage" : rawCommand;
  const argument = (parse?.[2] || "").trim();

  if (command === "help") {
    return {
      response: [
        "Codex slash commands:",
        "- `/help` show this help",
        "- `/usage` show token usage from latest Codex turn",
        "- `/model [name]` show or set active Codex model",
        "- `/approval [auto-edit|suggest|ask]` show or set approval mode",
        "- `/history` show recent user messages in this thread",
        "- `/clear` clear current thread messages",
        "- `/compact` alias of `/clear` in this client",
        "- `/undo` currently not supported in this integration",
      ].join("\n"),
    };
  }

  if (command === "usage") {
    if (!ctx.usage) {
      return {
        response: "No Codex usage data yet in this thread. Send one non-slash message first.",
      };
    }
    return {
      response: [
        "Latest Codex usage:",
        `- input_tokens: ${ctx.usage.inputTokens}`,
        `- cached_input_tokens: ${ctx.usage.cachedInputTokens}`,
        `- output_tokens: ${ctx.usage.outputTokens}`,
      ].join("\n"),
    };
  }

  if (command === "model") {
    if (!argument) {
      return { response: `Current Codex model: \`${ctx.currentModelId}\`` };
    }
    if (!ctx.availableModelIds.includes(argument)) {
      return {
        response: `Unknown model \`${argument}\`. Available: ${ctx.availableModelIds.map((m) => `\`${m}\``).join(", ")}`,
      };
    }
    return {
      response: `Codex model set to \`${argument}\`.`,
      nextModelId: argument,
    };
  }

  if (command === "approval") {
    if (!argument) {
      return { response: `Current approval mode: \`${ctx.currentApprovalMode}\`` };
    }
    if (!ctx.availableApprovalModes.includes(argument)) {
      return {
        response: `Invalid approval mode \`${argument}\`. Available: ${ctx.availableApprovalModes.map((m) => `\`${m}\``).join(", ")}`,
      };
    }
    return {
      response: `Approval mode set to \`${argument}\`.`,
      nextApprovalMode: argument,
    };
  }

  if (command === "history") {
    if (ctx.recentUserMessages.length === 0) {
      return { response: "No user message history in this thread yet." };
    }
    return {
      response: `Recent user messages:\n${ctx.recentUserMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}`,
    };
  }

  if (command === "clear" || command === "compact") {
    return {
      response:
        command === "compact"
          ? "Conversation compacted (implemented as local clear in this client)."
          : "Conversation cleared for this thread.",
      clearThread: true,
    };
  }

  if (command === "undo") {
    return { response: "`/undo` is not supported in this Codex integration yet." };
  }

  return { response: `Unknown command \`/${command}\`. Type \`/help\` for supported commands.` };
}
