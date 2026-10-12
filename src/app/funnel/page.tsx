import Link from "next/link";

import { EmptyState } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import { Button } from "@/components/ui/button";
import { getFunnels } from "@/server/db/funnel";
import { BUSINESSES } from "@/server/db/schema";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

const STAGE_LABEL: Record<string, string> = {
  qualified: "Qualified",
  discovery: "Discovery",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  demo: "Demo",
  pilot: "Pilot",
  proposal: "Proposal",
};

function percent(value: number | null) {
  return value === null ? "–" : `${Math.round(value * 100)}%`;
}

export default async function FunnelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const business = BUSINESSES.find((value) => value === params.business);
  const funnels = await getFunnels(business);
  const anyDeals = funnels.some((funnel) => funnel.total > 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Funnel"
        description="How far deals get through each pipeline, and where they drop out."
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="business" className="text-muted-foreground text-xs">
            Business
          </label>
          <select
            id="business"
            name="business"
            defaultValue={business ?? ""}
            className="border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">All</option>
            {BUSINESSES.map((value) => (
              <option key={value} value={value}>
                {BUSINESS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Update
        </Button>
        {business ? (
          <Link
            href="/funnel"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Reset
          </Link>
        ) : null}
      </form>

      {!anyDeals ? (
        <EmptyState
          title="No deals yet. Add a deal on a company and move it through the stages to see where deals stall."
          action={
            <Link
              href="/deals"
              className="text-accent text-sm font-medium hover:underline"
            >
              Go to deals
            </Link>
          }
        />
      ) : (
        funnels.map((funnel) => {
          const max = Math.max(1, ...funnel.stages.map((s) => s.reached));
          const closed = funnel.won + funnel.lost;
          return (
            <section
              key={funnel.business}
              className="flex flex-col gap-3"
              aria-labelledby={`funnel-${funnel.business}`}
            >
              <h2
                id={`funnel-${funnel.business}`}
                className="text-base font-semibold"
              >
                {BUSINESS_LABEL[funnel.business]}
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Deals" value={funnel.total} />
                <StatCard label="Won" value={funnel.won} />
                <StatCard label="Lost" value={funnel.lost} />
                <StatCard
                  label="Win rate"
                  value={closed ? percent(funnel.won / closed) : "–"}
                  hint={
                    funnel.avgDaysToWin === null
                      ? "Of closed deals"
                      : `Of closed deals, won in about ${funnel.avgDaysToWin} days`
                  }
                />
              </div>

              {funnel.total === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No deals for {BUSINESS_LABEL[funnel.business]} yet.
                </p>
              ) : (
                <ol className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
                  {funnel.stages.map((stage) => (
                    <li
                      key={stage.stage}
                      className="grid grid-cols-[7rem_1fr_6rem] items-center gap-3 text-sm md:grid-cols-[9rem_1fr_9rem]"
                    >
                      <span className="font-medium">
                        {STAGE_LABEL[stage.stage]}
                      </span>
                      <div
                        className="bg-muted h-3 overflow-hidden rounded-sm"
                        role="img"
                        aria-label={`${stage.reached} deals reached ${STAGE_LABEL[stage.stage]}`}
                      >
                        <div
                          className="bg-accent h-full rounded-sm"
                          style={{ width: `${(stage.reached / max) * 100}%` }}
                        />
                      </div>
                      <span className="num text-right">
                        {stage.reached}
                        <span className="text-muted-foreground">
                          {stage.conversion === null
                            ? ""
                            : ` · ${percent(stage.conversion)}`}
                        </span>
                        {stage.stillHere > 0 ? (
                          <span className="text-muted-foreground block text-xs">
                            {stage.stillHere} here now
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
