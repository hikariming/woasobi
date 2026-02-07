import { Download, ImageIcon, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewStore } from "@/stores/preview";

export function ImageTab() {
  const { images, selectedImageId, selectImage } = usePreviewStore();
  const selected = images.find((img) => img.id === selectedImageId) || images[0];

  if (images.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <ImageIcon size={24} className="text-muted-foreground mb-2" />
        <p className="text-sm font-medium text-foreground">No images yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Images from agent operations will appear here.
        </p>
      </div>
    );
  }

  const onDownload = () => {
    if (!selected) return;
    const link = document.createElement("a");
    link.href = selected.url;
    link.download = `${selected.id}.png`;
    link.click();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-xs text-muted-foreground">
          {images.length} image{images.length !== 1 ? "s" : ""} generated
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onDownload}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {selected ? (
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
        ) : (
          <div className="text-xs text-muted-foreground">No image selected</div>
        )}
      </div>

      {selected && (
        <>
          <div className="px-4 py-3 border-t border-border space-y-2">
            <div className="text-xs text-foreground">{selected.prompt}</div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>Model: {selected.model}</span>
              <span>Size: {selected.size}</span>
            </div>
          </div>

          <div className="flex gap-2 px-4 py-3 border-t border-border overflow-x-auto">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => selectImage(img.id)}
                className={cn(
                  "w-12 h-12 rounded-md overflow-hidden border-2 shrink-0 transition-colors",
                  selected.id === img.id ? "border-primary" : "border-border hover:border-muted-foreground"
                )}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
