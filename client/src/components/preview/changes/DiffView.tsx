import { cn } from "@/lib/utils";

interface DiffViewProps {
  diff: string;
}

export function DiffView({ diff }: DiffViewProps) {
  return (
    <pre className="text-[11px] font-mono p-3 leading-5 overflow-x-auto">
      {diff.split("\n").map((line, index) => (
        <div
          key={`${line}-${index}`}
          className={cn(
            "px-2 -mx-2",
            line.startsWith("+") && !line.startsWith("+++")
              ? "bg-green-500/10 text-green-300"
              : line.startsWith("-") && !line.startsWith("---")
                ? "bg-red-500/10 text-red-300"
                : line.startsWith("@@")
                  ? "text-blue-400"
                  : "text-muted-foreground"
          )}
        >
          {line}
        </div>
      ))}
    </pre>
  );
}
