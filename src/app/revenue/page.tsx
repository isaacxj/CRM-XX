import Link from "next/link";

import { PageHeader } from "@/components/kit/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { Delta, HBars, LineChart } from "@/components/revenue-charts";
import { getRevenue, type Money } from "@/server/db/revenue";
import {
  BUSINESSES,
  STATIXX_STAGES,
  TRAZO_STAGES,
  type Business,
} from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const STAGE_LABEL: Record<string, string> = {
  qualified: "Qualified",
  discovery: "Discovery",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  demo: "Demo",
  pilot: "Pilot",
  proposal: "Proposal",
};

function isBusiness(value: string): value is Business {
  return (BUSINESSES as readonly string[]).includes(value);
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatMoney(money: Money) {
  const parts: string[] = [];
  if (money.oneTimeCents > 0 || money.monthlyCents === 0) {
    parts.push(formatCents(money.oneTimeCents));
  }
  if (money.monthlyCents > 0) {
    parts.push(`${formatCents(money.monthlyCents)}/mo`);
  }
  return parts.join(" + ");
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const businessParam =
    typeof params.business === "string" ? params.business : "";
  const business: Business = isBusiness(businessParam)
    ? businessParam
    : "statixx";
  const openStages = (
    business === "statixx" ? STATIXX_STAGES : TRAZO_STAGES
  ).filter((stage) => stage !== "won" && stage !== "lost");

  const revenue = await getRevenue(business);
  const byStage = new Map(revenue.pipeline.map((row) => [row.stage, row]));
  const total = (money: Money) => money.oneTimeCents + money.monthlyCents;
  const pipelineRows = openStages.map((stage) => {
    const row = byStage.get(stage);
    return {
      label: STAGE_LABEL[stage],
      value: row ? total(row.money) : 0,
      display: row ? formatMoney(row.money) : formatCents(0),
      note: `${row?.count ?? 0} ${row?.count === 1 ? "deal" : "deals"}`,
    };
  });
  const mrrPoints = revenue.mrrByMonth.map((point) => ({
    label: new Date(`${point.month}-01T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }),
    value: point.cents,
    display: formatCents(point.cents),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Revenue"
        description={`${BUSINESS_LABEL[business]} pipeline, wins, and recurring revenue.`}
        actions={BUSINESSES.map((value) => (
          <Link
            key={value}
            href={`/revenue?business=${value}`}
            aria-current={value === business ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium outline-none focus-visible:ring-2 md:min-h-8",
              value === business
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:bg-surface-hover",
            )}
          >
            {BUSINESS_LABEL[value]}
          </Link>
        ))}
      />

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Won this month"
          value={formatMoney(revenue.wonThisMonth.money)}
          note={`${revenue.wonThisMonth.count} deals`}
          delta={
            <Delta
              current={total(revenue.wonThisMonth.money)}
              previous={revenue.previous.wonMonthCents}
            />
          }
        />
        <Kpi
          label="Won this quarter"
          value={formatMoney(revenue.wonThisQuarter.money)}
          note={`${revenue.wonThisQuarter.count} deals`}
          delta={
            <Delta
              current={total(revenue.wonThisQuarter.money)}
              previous={revenue.previous.wonQuarterCents}
            />
          }
        />
        <Kpi
          label="Win rate, last 90 days"
          value={
            revenue.winRate.percent === null
              ? "No closed deals"
              : `${revenue.winRate.percent}%`
          }
          note={`${revenue.winRate.won} won, ${revenue.winRate.lost} lost`}
          delta={
            <Delta
              points
              current={revenue.winRate.percent}
              previous={revenue.previous.winRatePercent}
            />
          }
        />
        <Kpi
          label="MRR"
          value={formatCents(revenue.mrrCents)}
          note={`${revenue.mrrClients.length} monthly clients`}
          delta={
            <Delta
              current={revenue.mrrCents}
              previous={revenue.previous.mrrCents}
            />
          }
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">
            Open pipeline by stage
          </h2>
          <HBars rows={pipelineRows} />
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold">MRR by month</h2>
          <LineChart points={mrrPoints} title="MRR at the end of each month" />
          <p className="text-muted-foreground mt-2 text-xs">
            Counts monthly deals from the month they were won. Past clients are
            left out because churn isn&apos;t tracked.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Monthly recurring clients</h2>
        {revenue.mrrClients.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            No won monthly deals yet. Move a monthly deal to Won on the{" "}
            <Link
              href={`/deals?business=${business}`}
              className="text-accent underline"
            >
              deals board
            </Link>{" "}
            and it will count toward MRR.
          </p>
        ) : (
          <ul className="divide-border mt-2 divide-y text-sm">
            {revenue.mrrClients.map((client) => (
              <li
                key={`${client.companyId}-${client.dealTitle}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <Link
                  href={`/companies/${client.companyId}`}
                  className="min-w-0 hover:underline"
                >
                  {client.companyName}
                  <span className="text-muted-foreground ml-2">
                    {client.dealTitle}
                  </span>
                </Link>
                <span className="num">
                  {formatCents(client.amountCents)}/mo
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  note,
  delta,
}: {
  label: string;
  value: string;
  note: string;
  delta: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="num text-2xl font-semibold">{value}</dd>
      <dd className="text-muted-foreground text-xs">{note}</dd>
      <dd className="text-xs">{delta}</dd>
    </Card>
  );
}
