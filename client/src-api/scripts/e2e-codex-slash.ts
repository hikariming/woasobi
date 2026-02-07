import { handleCodexSlashCommand, type CodexUsageSnapshot } from "../../src/lib/codexSlash.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

let currentModelId = "gpt-5.3-codex";
let currentApprovalMode = "auto-edit";
let usage: CodexUsageSnapshot | undefined;

const availableModelIds = ["gpt-5.3-codex", "gpt-4.1"];
const availableApprovalModes = ["auto-edit", "suggest", "ask"];

// 1) /usage before any run
const usageBefore = handleCodexSlashCommand({
  input: "/usage",
  currentModelId,
  availableModelIds,
  currentApprovalMode,
  availableApprovalModes,
  usage,
  recentUserMessages: [],
});
assert(
  usageBefore.response.includes("No Codex usage data yet"),
  "Expected /usage to report missing usage before first run"
);

// Simulate one real codex run usage snapshot
usage = { inputTokens: 1200, cachedInputTokens: 900, outputTokens: 180 };

// 2) /usage with data
const usageAfter = handleCodexSlashCommand({
  input: "/usage",
  currentModelId,
  availableModelIds,
  currentApprovalMode,
  availableApprovalModes,
  usage,
  recentUserMessages: ["Implement feature X", "Fix build issue"],
});
assert(usageAfter.response.includes("input_tokens: 1200"), "Expected /usage input_tokens");
assert(usageAfter.response.includes("cached_input_tokens: 900"), "Expected /usage cached_input_tokens");
assert(usageAfter.response.includes("output_tokens: 180"), "Expected /usage output_tokens");

// 2b) /useage typo alias
const usageTypo = handleCodexSlashCommand({
  input: "/useage",
  currentModelId,
  availableModelIds,
  currentApprovalMode,
  availableApprovalModes,
  usage,
  recentUserMessages: [],
});
assert(usageTypo.response.includes("input_tokens: 1200"), "Expected /useage alias to resolve to /usage");

// 3) /model
const modelResult = handleCodexSlashCommand({
  input: "/model gpt-4.1",
  currentModelId,
  availableModelIds,
  currentApprovalMode,
  availableApprovalModes,
  usage,
  recentUserMessages: [],
});
assert(modelResult.nextModelId === "gpt-4.1", "Expected /model to return nextModelId");
currentModelId = modelResult.nextModelId || currentModelId;

// 4) /approval
const approvalResult = handleCodexSlashCommand({
  input: "/approval ask",
  currentModelId,
  availableModelIds,
  currentApprovalMode,
  availableApprovalModes,
  usage,
  recentUserMessages: [],
});
assert(approvalResult.nextApprovalMode === "ask", "Expected /approval to return nextApprovalMode");
currentApprovalMode = approvalResult.nextApprovalMode || currentApprovalMode;

console.log("PASS: /usage, /model, /approval");
console.log(`Model=${currentModelId}, Approval=${currentApprovalMode}`);
