import { useState } from 'react';
import { Download, RefreshCw, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

const mockImages = [
  {
    id: 'img-1',
    prompt: 'A futuristic AI desktop client interface with dark theme',
    model: 'DALL-E 3',
    size: '1024x1024',
    // Using SVG data URI as mock image
    url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1a1a2e"/>
          <stop offset="100%" style="stop-color:#16213e"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#7c3aed"/>
          <stop offset="100%" style="stop-color:#2563eb"/>
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#bg)"/>
      <rect x="20" y="20" width="80" height="360" rx="8" fill="#0f3460" opacity="0.5"/>
      <rect x="110" y="20" width="160" height="360" rx="8" fill="#0f3460" opacity="0.3"/>
      <rect x="280" y="20" width="100" height="360" rx="8" fill="#0f3460" opacity="0.5"/>
      <rect x="30" y="30" width="60" height="8" rx="4" fill="url(#accent)"/>
      <rect x="30" y="50" width="60" height="4" rx="2" fill="#ffffff" opacity="0.2"/>
      <rect x="30" y="60" width="50" height="4" rx="2" fill="#ffffff" opacity="0.15"/>
      <rect x="30" y="70" width="55" height="4" rx="2" fill="#ffffff" opacity="0.15"/>
      <circle cx="130" cy="50" r="12" fill="url(#accent)" opacity="0.3"/>
      <rect x="150" y="42" width="100" height="6" rx="3" fill="#ffffff" opacity="0.2"/>
      <rect x="150" y="54" width="80" height="4" rx="2" fill="#ffffff" opacity="0.1"/>
      <rect x="120" y="80" width="140" height="40" rx="6" fill="#7c3aed" opacity="0.15"/>
      <rect x="130" y="90" width="100" height="4" rx="2" fill="#ffffff" opacity="0.3"/>
      <rect x="130" y="100" width="80" height="4" rx="2" fill="#ffffff" opacity="0.15"/>
      <text x="200" y="220" text-anchor="middle" fill="#7c3aed" font-family="system-ui" font-size="14" opacity="0.8">WoaSobi AI</text>
      <text x="200" y="240" text-anchor="middle" fill="#ffffff" font-family="system-ui" font-size="10" opacity="0.4">Desktop Client Concept</text>
    </svg>`)}`,
  },
  {
    id: 'img-2',
    prompt: 'Abstract neural network visualization with purple gradients',
    model: 'DALL-E 3',
    size: '1024x1024',
    url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <defs>
        <radialGradient id="g1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:0.8"/>
          <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill="#0f0f23"/>
      <circle cx="200" cy="200" r="150" fill="url(#g1)" opacity="0.4"/>
      <circle cx="200" cy="200" r="6" fill="#a78bfa"/>
      <circle cx="150" cy="150" r="4" fill="#818cf8"/>
      <circle cx="250" cy="150" r="4" fill="#818cf8"/>
      <circle cx="150" cy="250" r="4" fill="#818cf8"/>
      <circle cx="250" cy="250" r="4" fill="#818cf8"/>
      <circle cx="120" cy="200" r="3" fill="#6366f1"/>
      <circle cx="280" cy="200" r="3" fill="#6366f1"/>
      <circle cx="200" cy="120" r="3" fill="#6366f1"/>
      <circle cx="200" cy="280" r="3" fill="#6366f1"/>
      <line x1="200" y1="200" x2="150" y2="150" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
      <line x1="200" y1="200" x2="250" y2="150" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
      <line x1="200" y1="200" x2="150" y2="250" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
      <line x1="200" y1="200" x2="250" y2="250" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
      <line x1="200" y1="200" x2="120" y2="200" stroke="#6366f1" stroke-width="0.5" opacity="0.3"/>
      <line x1="200" y1="200" x2="280" y2="200" stroke="#6366f1" stroke-width="0.5" opacity="0.3"/>
      <line x1="200" y1="200" x2="200" y2="120" stroke="#6366f1" stroke-width="0.5" opacity="0.3"/>
      <line x1="200" y1="200" x2="200" y2="280" stroke="#6366f1" stroke-width="0.5" opacity="0.3"/>
      <line x1="150" y1="150" x2="250" y2="150" stroke="#818cf8" stroke-width="0.5" opacity="0.3"/>
      <line x1="150" y1="250" x2="250" y2="250" stroke="#818cf8" stroke-width="0.5" opacity="0.3"/>
      <line x1="150" y1="150" x2="150" y2="250" stroke="#818cf8" stroke-width="0.5" opacity="0.3"/>
      <line x1="250" y1="150" x2="250" y2="250" stroke="#818cf8" stroke-width="0.5" opacity="0.3"/>
      <text x="200" y="350" text-anchor="middle" fill="#a78bfa" font-family="system-ui" font-size="11" opacity="0.6">Neural Network</text>
    </svg>`)}`,
  },
];

export function ImageTab() {
  const [selected, setSelected] = useState(mockImages[0]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground">
          {mockImages.length} image{mockImages.length !== 1 ? 's' : ''} generated
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Download size={14} />
          </button>
          <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="relative group">
          <img
            src={selected.url}
            alt={selected.prompt}
            className="max-w-full max-h-[300px] rounded-lg border border-border shadow-lg"
          />
          <button className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* Image info */}
      <div className="px-4 py-3 border-t border-border space-y-2">
        <div className="text-xs text-foreground">{selected.prompt}</div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Model: {selected.model}</span>
          <span>Size: {selected.size}</span>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 px-4 py-3 border-t border-border overflow-x-auto">
        {mockImages.map((img) => (
          <button
            key={img.id}
            onClick={() => setSelected(img)}
            className={cn(
              'w-12 h-12 rounded-md overflow-hidden border-2 shrink-0 transition-colors',
              selected.id === img.id ? 'border-primary' : 'border-border hover:border-muted-foreground'
            )}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
