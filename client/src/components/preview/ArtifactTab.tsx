import { useState } from 'react';
import { RefreshCw, ExternalLink, Smartphone, Monitor, Tablet } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'desktop' | 'tablet' | 'mobile';

const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #334155; }
    .card h3 { font-size: 14px; margin-bottom: 8px; color: #f1f5f9; }
    .card p { font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat { background: #1e293b; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #334155; }
    .stat-value { font-size: 24px; font-weight: 700; color: #818cf8; }
    .stat-label { font-size: 11px; color: #94a3b8; margin-top: 4px; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    .badge { display: inline-block; font-size: 10px; background: #312e81; color: #a5b4fc; padding: 2px 8px; border-radius: 100px; margin-left: 8px; }
  </style>
</head>
<body>
  <h1>Dashboard <span class="badge">Preview</span></h1>
  <div class="stats">
    <div class="stat"><div class="stat-value">124.5K</div><div class="stat-label">Tokens Used</div></div>
    <div class="stat"><div class="stat-value">47</div><div class="stat-label">Conversations</div></div>
    <div class="stat"><div class="stat-value">99.2%</div><div class="stat-label">Uptime</div></div>
  </div>
  <div class="card"><h3>Recent Activity</h3><p>Fixed shadow database migration error in prisma setup. Updated billing API to handle quota enforcement. Added middleware for API key validation.</p></div>
  <div class="card"><h3>Quick Actions</h3><p>Create new conversation, review code changes, manage workspace settings, configure model providers.</p></div>
</body>
</html>`;

export function ArtifactTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');

  const widthMap: Record<ViewMode, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          {[
            { mode: 'desktop' as const, icon: Monitor },
            { mode: 'tablet' as const, icon: Tablet },
            { mode: 'mobile' as const, icon: Smartphone },
          ].map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                viewMode === mode
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 bg-muted/20 flex items-start justify-center p-4 overflow-auto">
        <div
          className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
          style={{ width: widthMap[viewMode], maxWidth: '100%' }}
        >
          <iframe
            srcDoc={mockHtml}
            title="Artifact Preview"
            className="w-full border-0"
            style={{ height: '400px' }}
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}
