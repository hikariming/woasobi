export function TerminalTab() {
  const lines = [
    { type: 'cmd' as const, text: '$ git status --porcelain' },
    { type: 'out' as const, text: 'M  src/api/billing.ts' },
    { type: 'out' as const, text: 'M  src/middleware/auth.ts' },
    { type: 'out' as const, text: '?? prisma/migrations/20260206005516_add_billing/' },
    { type: 'cmd' as const, text: '$ npx prisma migrate status' },
    { type: 'out' as const, text: 'Database schema is up to date!' },
    { type: 'cmd' as const, text: '$ pnpm dev' },
    { type: 'out' as const, text: 'VITE v7.2.4  ready in 240 ms' },
    { type: 'out' as const, text: '' },
    { type: 'out' as const, text: '  ➜  Local:   http://localhost:3000/' },
    { type: 'out' as const, text: '  ➜  Network: http://192.168.1.42:3000/' },
  ];

  return (
    <div className="h-full bg-[oklch(0.13_0_0)] p-3 font-mono text-xs">
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            line.type === 'cmd'
              ? 'text-green-400 mt-2 first:mt-0'
              : 'text-muted-foreground'
          }
        >
          {line.text || '\u00A0'}
        </div>
      ))}
      <div className="mt-2 text-green-400">
        $ <span className="inline-block w-1.5 h-3.5 bg-green-400/70 animate-pulse align-middle" />
      </div>
    </div>
  );
}
