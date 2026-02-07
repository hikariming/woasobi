import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ChevronDown, ChevronRight, Terminal, User, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

interface Props {
  message: Message;
  isStreaming?: boolean;
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

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={14} className="text-primary" />
        </div>
      )}

      <div className={cn('max-w-[85%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        {/* Tool Calls */}
        {message.toolCalls?.map((tc) => (
          <div key={tc.id} className="rounded-lg border border-border bg-muted/30 text-xs overflow-hidden">
            <button
              onClick={() => toggleTool(tc.id)}
              className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/50 transition-colors"
            >
              {expandedTools.has(tc.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Terminal size={12} className="text-muted-foreground" />
              <span className="font-mono text-muted-foreground">{tc.name}</span>
              <span className="font-mono text-foreground/70 truncate">
                {Object.values(tc.args).join(' ')}
              </span>
            </button>
            {expandedTools.has(tc.id) && tc.output && (
              <div className="px-3 py-2 border-t border-border bg-background/50">
                <pre className="font-mono text-[11px] text-muted-foreground whitespace-pre-wrap">{tc.output}</pre>
              </div>
            )}
          </div>
        ))}

        {/* Message Content */}
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-foreground'
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeStr = String(children).replace(/\n$/, '');

                if (match) {
                  const codeId = `code-${message.id}-${match[1]}`;
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
              p({ children }) {
                return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
              },
              ul({ children }) {
                return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
          <User size={14} className="text-foreground/70" />
        </div>
      )}
    </div>
  );
}
