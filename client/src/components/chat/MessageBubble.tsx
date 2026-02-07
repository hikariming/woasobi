import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronRight, Terminal, User, Bot } from 'lucide-react';
import type { Message, MessagePart } from '@/types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

/** Summarise tool call args for the collapsed header */
function getToolLabel(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'Bash': return String(args.command || '').slice(0, 80);
    case 'Read': return String(args.file_path || args.path || '');
    case 'Edit': return String(args.file_path || args.path || '');
    case 'Write': return String(args.file_path || args.path || '');
    case 'Glob': return String(args.pattern || '');
    case 'Grep': return String(args.pattern || '');
    case 'WebSearch': return String(args.query || '');
    case 'WebFetch': return String(args.url || '');
    case 'Task': return String(args.description || args.prompt || '').slice(0, 60);
    default: return Object.values(args).map(String).join(' ').slice(0, 80);
  }
}

export function MessageBubble({ message, isStreaming }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const isUser = message.role === 'user';

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleTool = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markdownComponents = {
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode; [key: string]: unknown }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeStr = String(children).replace(/\n$/, '');

      if (match) {
        const codeId = `code-${message.id}-${match[1]}-${codeStr.length}`;
        return (
          <div className="relative my-2 rounded-lg overflow-hidden border border-border">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 text-xs text-muted-foreground">
              <span>{match[1]}</span>
              <button
                onClick={() => copyCode(codeStr, codeId)}
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                {copiedId === codeId ? <Check size={12} /> : <Copy size={12} />}
                {copiedId === codeId ? 'Copied' : 'Copy'}
              </button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={match[1]}
              PreTag="div"
              customStyle={{ margin: 0, borderRadius: 0, fontSize: '12px' }}
            >
              {codeStr}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code className="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
          {children}
        </code>
      );
    },
    p({ children }: { children?: React.ReactNode }) {
      return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
    },
    ul({ children }: { children?: React.ReactNode }) {
      return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
    },
    ol({ children }: { children?: React.ReactNode }) {
      return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
    },
  };

  /** Render a single tool_use part */
  const renderToolBlock = (part: Extract<MessagePart, { type: 'tool_use' }>) => (
    <div key={part.id} className="rounded-lg border border-border bg-muted/30 text-xs overflow-hidden">
      <button
        onClick={() => toggleTool(part.id)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
      >
        {expandedTools.has(part.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <Terminal size={12} className="text-muted-foreground" />
        <span className="font-mono text-muted-foreground shrink-0">{part.name}</span>
        <span className="font-mono text-foreground/70 truncate">
          {getToolLabel(part.name, part.args)}
        </span>
      </button>
      {expandedTools.has(part.id) && part.output && (
        <div className="px-3 py-2 border-t border-border bg-background/50 max-h-60 overflow-y-auto">
          <pre className="font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">{part.output}</pre>
        </div>
      )}
    </div>
  );

  /** Render a text part as markdown */
  const renderTextBlock = (content: string, key: string, showCursor?: boolean) => {
    // Skip empty text parts
    const trimmed = content.trim();
    if (!trimmed && !showCursor) return null;

    return (
      <div key={key} className="text-sm text-foreground">
        {trimmed && (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        )}
        {showCursor && (
          <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    );
  };

  /** Render interleaved parts (preferred) or fallback to old content+toolCalls */
  const renderContent = () => {
    if (message.parts && message.parts.length > 0) {
      return message.parts.map((part, i) => {
        if (part.type === 'text') {
          const isLast = i === message.parts!.length - 1;
          return renderTextBlock(part.content, `text-${i}`, isStreaming && isLast);
        }
        return renderToolBlock(part);
      });
    }

    // Fallback: old-style content + toolCalls (backward compat for loaded history)
    return (
      <>
        {message.toolCalls?.map((tc) => (
          <div key={tc.id} className="rounded-lg border border-border bg-muted/30 text-xs overflow-hidden">
            <button
              onClick={() => toggleTool(tc.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              {expandedTools.has(tc.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Terminal size={12} className="text-muted-foreground" />
              <span className="font-mono text-muted-foreground shrink-0">{tc.name}</span>
              <span className="font-mono text-foreground/70 truncate">
                {getToolLabel(tc.name, tc.args)}
              </span>
            </button>
            {expandedTools.has(tc.id) && tc.output && (
              <div className="px-3 py-2 border-t border-border bg-background/50 max-h-60 overflow-y-auto">
                <pre className="font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">{tc.output}</pre>
              </div>
            )}
          </div>
        ))}
        {renderTextBlock(message.content, 'content', isStreaming)}
      </>
    );
  };

  // User messages: simple bubble
  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[85%]">
          <div className="rounded-xl px-4 py-3 text-sm bg-primary text-primary-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
          <User size={14} className="text-foreground/70" />
        </div>
      </div>
    );
  }

  // Assistant messages: interleaved parts
  return (
    <div className="flex gap-3 justify-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={14} className="text-primary" />
      </div>
      <div className="max-w-[85%] space-y-2">
        {renderContent()}
      </div>
    </div>
  );
}
