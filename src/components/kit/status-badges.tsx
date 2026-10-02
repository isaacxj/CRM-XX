import { Badge } from "@/components/ui/badge";
import type { Business, CompanyStatus } from "@/server/db/schema";

const STATUS: Record<
  CompanyStatus,
  { label: string; tone: "neutral" | "accent" | "success" }
> = {
  prospect: { label: "Prospect", tone: "neutral" },
  client: { label: "Client", tone: "success" },
  past: { label: "Past client", tone: "neutral" },
};

export function StatusBadge({ status }: { status: CompanyStatus }) {
  const { label, tone } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function BusinessBadge({ business }: { business: Business }) {
  return (
    <span data-business={business} className="inline-flex">
      <Badge tone="accent">
        {business === "statixx" ? "Statixx" : "Trazo"}
      </Badge>
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  const tone =
    stage === "won" || stage === "Won"
      ? "success"
      : stage === "lost" || stage === "Lost"
        ? "danger"
        : "info";
  return <Badge tone={tone}>{stage}</Badge>;
}
