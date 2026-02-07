import { Loader2, Circle } from "lucide-react";
import type { ThreadRuntimeStatus } from "@/stores/chat";

export function ThreadStatusIndicator({ status }: { status: ThreadRuntimeStatus }) {
  if (status === "running") {
    return (
      <span title="Running" aria-label="Running">
        <Loader2 className="size-3 animate-spin text-sky-400" />
      </span>
    );
  }
  if (status === "awaiting-permission") {
    return (
      <span title="Waiting for permission" aria-label="Waiting for permission">
        <Circle className="size-2 fill-amber-400 text-amber-400" />
      </span>
    );
  }
  // completed
  return (
    <span title="Completed" aria-label="Completed">
      <Circle className="size-2 fill-emerald-400 text-emerald-400" />
    </span>
  );
}
