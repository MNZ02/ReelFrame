import { Loader2 } from "lucide-react";
import type { GenerationStatus } from "@repo/shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VARIANT: Record<GenerationStatus, "secondary" | "warning" | "success" | "destructive" | "outline"> = {
  queued: "secondary",
  processing: "warning",
  succeeded: "success",
  failed: "destructive",
  canceled: "outline",
};

const LABEL: Record<GenerationStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  succeeded: "Ready",
  failed: "Failed",
  canceled: "Canceled",
};

export function StatusBadge({ status, className }: { status: GenerationStatus; className?: string }) {
  const isActive = status === "queued" || status === "processing";
  return (
    <Badge variant={VARIANT[status]} className={cn("gap-1", className)}>
      {isActive && <Loader2 className="size-3 animate-spin" />}
      {LABEL[status]}
    </Badge>
  );
}
