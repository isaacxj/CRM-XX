import { Badge } from "@/components/ui/badge";

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

// Open deals sitting in a stage a long time get warmer chips.
export function AgeChip({ days, stage }: { days: number; stage: string }) {
  const closed = stage === "won" || stage === "lost";
  const tone = closed
    ? "neutral"
    : days >= 30
      ? "danger"
      : days >= 14
        ? "warning"
        : "neutral";
  return (
    <Badge tone={tone} className="num">
      {days === 0 ? "Today" : `${days}d`}
    </Badge>
  );
}
