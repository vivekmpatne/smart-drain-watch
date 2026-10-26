import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  NORMAL: "bg-state-normal/15 text-state-normal",
  WATCH: "bg-state-watch/15 text-state-watch",
  ALERT: "bg-state-alert/15 text-state-alert-text",
  CRITICAL: "bg-state-critical/15 text-state-critical-text",
  ESCALATED: "bg-state-critical/15 text-state-critical-text border border-state-critical",
};

export function StateBadge({ state, className }: { state: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", STYLES[state] ?? STYLES.NORMAL, className)}>
      {state}
    </span>
  );
}
