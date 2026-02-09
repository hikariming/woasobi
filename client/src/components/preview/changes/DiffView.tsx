import { cn } from "@/lib/utils";

interface DiffViewProps {
  diff: string;
}

interface DiffLine {
  content: string;
  type: "add" | "remove" | "context" | "header" | "meta";
  oldLineNum: number | null;
  newLineNum: number | null;
}

function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (
      line.startsWith("diff ") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("new file") ||
      line.startsWith("deleted file") ||
      line.startsWith("similarity") ||
      line.startsWith("rename")
    ) {
      result.push({ content: line, type: "meta", oldLineNum: null, newLineNum: null });
      continue;
    }

    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push({ content: line, type: "header", oldLineNum: null, newLineNum: null });
      continue;
    }

    if (line.startsWith("+")) {
      result.push({ content: line.slice(1), type: "add", oldLineNum: null, newLineNum: newLine });
      newLine++;
    } else if (line.startsWith("-")) {
      result.push({ content: line.slice(1), type: "remove", oldLineNum: oldLine, newLineNum: null });
      oldLine++;
    } else {
      const content = line.startsWith(" ") ? line.slice(1) : line;
      result.push({ content, type: "context", oldLineNum: oldLine, newLineNum: newLine });
      oldLine++;
      newLine++;
    }
  }

  return result;
}

export function DiffView({ diff }: DiffViewProps) {
  if (!diff.trim()) {
    return (
      <div className="p-3 text-xs text-muted-foreground">No diff available</div>
    );
  }

  const lines = parseDiff(diff);

  return (
    <div className="overflow-x-auto text-[11px] font-mono leading-[18px]">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => (
            <tr
              key={i}
              className={cn(
                line.type === "add" && "bg-green-500/10",
                line.type === "remove" && "bg-red-500/10",
                line.type === "header" && "bg-blue-500/5",
                line.type === "meta" && "bg-muted/30",
              )}
            >
              <td className="w-[40px] text-right pr-1.5 pl-1 select-none text-muted-foreground/40 border-r border-border/20">
                {line.oldLineNum ?? ""}
              </td>
              <td className="w-[40px] text-right pr-1.5 select-none text-muted-foreground/40 border-r border-border/20">
                {line.newLineNum ?? ""}
              </td>
              <td className={cn(
                "w-4 text-center select-none",
                line.type === "add" && "text-green-400",
                line.type === "remove" && "text-red-400",
              )}>
                {line.type === "add" ? "+" : line.type === "remove" ? "−" : ""}
              </td>
              <td className={cn(
                "pl-1 pr-2 whitespace-pre",
                line.type === "add" && "text-green-300",
                line.type === "remove" && "text-red-300",
                line.type === "header" && "text-blue-400",
                line.type === "meta" && "text-muted-foreground/60",
                line.type === "context" && "text-muted-foreground",
              )}>
                {line.content}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
