import { Filter, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangeHeaderProps {
  filter: "all" | "staged" | "unstaged";
  count: number;
  onFilter: (filter: "all" | "staged" | "unstaged") => void;
}

const filters = ["all", "unstaged", "staged"] as const;

export function ChangeHeader({ filter, count, onFilter }: ChangeHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Filter size={12} className="text-muted-foreground" />
      <div className="flex items-center gap-1">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => onFilter(item)}
            className={cn(
              "px-2.5 py-1 text-[11px] rounded-md capitalize transition-colors",
              filter === item
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <span className="ml-auto text-[11px] text-muted-foreground">
        {count} file{count !== 1 ? "s" : ""}
      </span>
      <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
        <MoreHorizontal size={13} />
      </button>
    </div>
  );
}
