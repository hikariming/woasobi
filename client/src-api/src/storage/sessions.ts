/**
 * Parse CLI session files (Claude Code & Codex) into WoaSobi message format
 */

import { readFileSync, existsSync } from 'node:fs';
import type { StoredMessage } from './index.js';

/**
 * Parse a Claude Code session JSONL file into messages
 */
export function parseClaudeSession(filePath: string): StoredMessage[] {
  if (!existsSync(filePath)) return [];

  const messages: StoredMessage[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);

        if (obj.type === 'user' && obj.message?.role === 'user') {
          const msgContent = obj.message.content;
          if (typeof msgContent === 'string') {
            messages.push({
              id: obj.uuid || `cc-${messages.length}`,
              role: 'user',
              content: msgContent,
              timestamp: obj.timestamp || new Date().toISOString(),
            });
          } else if (Array.isArray(msgContent)) {
            // User message with content blocks - skip tool_result entries
            const textBlocks = msgContent.filter((c: any) => c.type === 'text');
            if (textBlocks.length > 0) {
              messages.push({
                id: obj.uuid || `cc-${messages.length}`,
                role: 'user',
                content: textBlocks.map((c: any) => c.text).join('\n'),
                timestamp: obj.timestamp || new Date().toISOString(),
              });
            }
            // Pure tool_result entries are skipped (internal plumbing)
          }
        }

        if (obj.type === 'assistant' && obj.message?.role === 'assistant') {
          const contentArr = obj.message.content;
          if (!Array.isArray(contentArr)) continue;

          const text = contentArr
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n');

          const toolCalls = contentArr
            .filter((c: any) => c.type === 'tool_use')
            .map((c: any) => ({
              id: c.id || `tc-${messages.length}`,
              name: c.name || 'unknown',
              args: c.input || {},
            }));

          if (text || toolCalls.length > 0) {
            messages.push({
              id: obj.uuid || `cc-${messages.length}`,
              role: 'assistant',
              content: text,
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
              timestamp: obj.timestamp || new Date().toISOString(),
            });
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File read failed
  }

  return messages;
}

/**
 * Parse a Codex CLI session JSONL file into messages.
 * Codex format:
 *   - event_msg with payload.type="user_message" → user message (payload.message is the text)
 *   - response_item with payload.role="assistant" → assistant (content[].type="output_text")
 *   - response_item with role="user"/"developer" → system context (skip)
 */
export function parseCodexSession(filePath: string): StoredMessage[] {
  if (!existsSync(filePath)) return [];

  const messages: StoredMessage[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);

        // User messages: event_msg with type=user_message
        if (obj.type === 'event_msg' && obj.payload?.type === 'user_message') {
          // User text is in payload.message (string) or payload.content
          const text = obj.payload.message
            || (obj.payload.content || [])
                .filter((c: any) => c.type === 'input_text')
                .map((c: any) => c.text)
                .join('\n');

          if (text) {
            messages.push({
              id: obj.payload.id || `cx-${messages.length}`,
              role: 'user',
              content: text,
              timestamp: obj.timestamp || new Date().toISOString(),
            });
          }
        }

        // Assistant messages: response_item with role=assistant
        if (obj.type === 'response_item' && obj.payload?.role === 'assistant') {
          const textParts = (obj.payload.content || [])
            .filter((c: any) => c.type === 'output_text')
            .map((c: any) => c.text);

          if (textParts.length > 0) {
            messages.push({
              id: obj.payload.id || `cx-${messages.length}`,
              role: 'assistant',
              content: textParts.join('\n'),
              timestamp: obj.timestamp || new Date().toISOString(),
            });
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File read failed
  }

  return messages;
}
