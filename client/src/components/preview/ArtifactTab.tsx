import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewStore } from "@/stores/preview";

const widthMap = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
} as const;

export function ArtifactTab() {
  const {
    artifacts,
    selectedArtifactId,
    artifactViewport,
    artifactRefreshing,
    artifactError,
    setArtifactViewport,
    refreshArtifact,
  } = usePreviewStore();

  const selected = artifacts.find((item) => item.id === selectedArtifactId) || null;

  const openPreview = () => {
    if (!selected) return;
    const blob = new Blob([selected.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-1">
          {[
            { mode: "desktop" as const, icon: Monitor },
            { mode: "tablet" as const, icon: Tablet },
            { mode: "mobile" as const, icon: Smartphone },
          ].map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setArtifactViewport(mode)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                artifactViewport === mode
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refreshArtifact}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <RefreshCw size={14} className={cn(artifactRefreshing && "animate-spin")} />
          </button>
          <button
            onClick={openPreview}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 flex items-start justify-center p-4 overflow-auto">
        {!selected && (
          <div className="text-xs text-muted-foreground">No artifact selected</div>
        )}

        {selected && artifactError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {artifactError}
          </div>
        )}

        {selected && !artifactError && artifactRefreshing && (
          <div className="w-full max-w-[760px] space-y-3">
            <div className="h-6 rounded-md bg-muted animate-pulse" />
            <div className="h-56 rounded-md bg-muted animate-pulse" />
            <div className="h-24 rounded-md bg-muted animate-pulse" />
          </div>
        )}

        {selected && !artifactError && !artifactRefreshing && (
          <div
            className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
            style={{ width: widthMap[artifactViewport], maxWidth: "100%" }}
          >
            <iframe
              srcDoc={selected.html}
              title={selected.title}
              className="w-full border-0"
              style={{ height: "420px" }}
              sandbox="allow-scripts"
            />
          </div>
        )}
      </div>
    </div>
  );
}
