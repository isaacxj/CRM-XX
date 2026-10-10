import Link from "next/link";

import { formatCents } from "@/components/deal-shared";
import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge, StageBadge } from "@/components/kit/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CLOSING_GROUPS, closingGroup, daysUntil } from "@/lib/closing";
import { CLOSING_CAP, listClosingDeals } from "@/server/db/deals";
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

function closeLabel(closeDate: string | null, today: string) {
  if (!closeDate) return "—";
  const days = daysUntil(closeDate, today);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "1 day ago";
  return days < 0 ? `${-days} days ago` : `In ${days} days`;
}

export default async function ClosingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const business = BUSINESSES.find((value) => value === params.business);
  const today = new Date().toISOString().slice(0, 10);

  const deals = await listClosingDeals({ business, q: q || undefined });
  const groups = CLOSING_GROUPS.map((group) => {
    const rows = deals.filter(
      (deal) => closingGroup(deal.closeDate, today) === group.key,
    );
    return {
      ...group,
      rows,
      cents: rows.reduce((sum, deal) => sum + deal.amountCents, 0),
    };
  }).filter((group) => group.rows.length > 0);
  const hasFilters = Boolean(q || business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Closing"
        description="Open deals by expected close date, so you can see what should land next. Open a row to go to its company."
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
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs">
            Search deals
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Deal or company"
            className="w-72"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {hasFilters ? (
          <Link
            href="/closing"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {groups.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No open deals match these filters. Try fewer words or clear the filters."
              : "No open deals. Add a deal with a close date on a company page."
          }
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
        groups.map((group) => (
          <section
            key={group.key}
            aria-labelledby={`closing-${group.key}`}
            className="flex flex-col gap-2"
          >
            <h2
              id={`closing-${group.key}`}
              className="flex items-baseline gap-2 text-sm font-medium"
            >
              {group.label}
              <span className="text-muted-foreground num text-xs">
                {group.rows.length} · {formatCents(group.cents)}
              </span>
            </h2>
            <DataTable>
              <thead>
                <tr>
                  <Th>Closes</Th>
                  <Th>Deal</Th>
                  <Th>Company</Th>
                  <Th>Stage</Th>
                  <Th className="text-right">Value</Th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((deal) => (
                  <Tr key={deal.id} href={`/companies/${deal.companyId}`}>
                    <Td className="whitespace-nowrap">
                      <span className="num">{deal.closeDate ?? "—"}</span>{" "}
                      <span
                        className={
                          group.key === "overdue"
                            ? "text-danger text-xs"
                            : "text-muted-foreground text-xs"
                        }
                      >
                        {closeLabel(deal.closeDate, today)}
                      </span>
                    </Td>
                    <Td className="font-medium">{deal.title}</Td>
                    <Td>
                      {deal.companyName}{" "}
                      <BusinessBadge business={deal.business} />
                    </Td>
                    <Td>
                      <StageBadge
                        stage={STAGE_LABEL[deal.stage] ?? deal.stage}
                      />
                    </Td>
                    <Td className="num text-right whitespace-nowrap">
                      {formatCents(deal.amountCents)}
                      {deal.billing === "monthly" ? (
                        <Badge tone="neutral" className="ml-1.5">
                          monthly
                        </Badge>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          </section>
        ))
      )}
      {deals.length >= CLOSING_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the first {CLOSING_CAP} deals. Filter by business or search to
          narrow the list.
        </p>
      ) : null}
    </div>
  );
}
