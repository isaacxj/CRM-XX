import Link from "next/link";
import { redirect } from "next/navigation";

import { formatCents } from "@/components/deal-shared";
import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge } from "@/components/kit/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  firstProblem,
  formObject,
  idInput,
  revisitInput,
  withProblem,
} from "@/lib/action-input";
import { daysSince } from "@/lib/stalled";
import {
  LOST_CAP,
  getDealDetail,
  listLostDeals,
  reopenLostDeal,
} from "@/server/db/deals";
import { BUSINESSES } from "@/server/db/schema";
import { createTask } from "@/server/db/tasks";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;
const NO_REASON = "No reason recorded";

export default async function LostDealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const business = BUSINESSES.find((value) => value === params.business);
  const reason = typeof params.reason === "string" ? params.reason : "";
  const done = typeof params.done === "string" ? params.done : "";

  const query = new URLSearchParams();
  if (business) query.set("business", business);
  if (q) query.set("q", q);
  if (reason) query.set("reason", reason);
  const here = query.size ? `/lost?${query}` : "/lost";

  async function reopen(formData: FormData) {
    "use server";
    const parsed = idInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    try {
      await reopenLostDeal(parsed.data.id);
    } catch {
      redirect(
        withProblem(
          here,
          "That deal is no longer lost. Reload the list to see its current stage.",
        ),
      );
    }
    const next = new URLSearchParams(query);
    next.set("done", "Deal reopened in Qualified.");
    redirect(`/lost?${next}`);
  }

  async function revisit(formData: FormData) {
    "use server";
    const parsed = revisitInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    const deal = await getDealDetail(parsed.data.dealId);
    if (!deal)
      redirect(
        withProblem(here, "That deal no longer exists. Reload the list."),
      );
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + parsed.data.days);
    await createTask(deal.companyId, {
      title: `Revisit lost deal: ${deal.title}`,
      dueDate: due.toISOString().slice(0, 10),
    });
    const next = new URLSearchParams(query);
    next.set("done", `Follow-up added for ${parsed.data.days} days from now.`);
    redirect(`/lost?${next}`);
  }

  const all = (await listLostDeals({ business, q: q || undefined })).map(
    (deal) => ({
      ...deal,
      reasonLabel: deal.lostReason?.trim() || NO_REASON,
      days: daysSince(deal.lostAt),
    }),
  );
  const reasons = [...Map.groupBy(all, (deal) => deal.reasonLabel)]
    .map(([label, rows]) => ({ label, count: rows.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const rows = reason ? all.filter((deal) => deal.reasonLabel === reason) : all;
  const lostCents = rows.reduce((sum, deal) => sum + deal.amountCents, 0);
  const hasFilters = Boolean(q || business || reason);

  const chipHref = (label: string) => {
    const next = new URLSearchParams();
    if (business) next.set("business", business);
    if (q) next.set("q", q);
    if (label && label !== reason) next.set("reason", label);
    return next.size ? `/lost?${next}` : "/lost";
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Lost deals"
        description="Deals that were lost, newest first, with why. Reopen one that is back on, or schedule a follow-up to revisit it in 30 or 90 days."
      />

      {done ? (
        <p role="status" className="text-success text-sm">
          {done}
        </p>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" method="get">
        {reason ? <input type="hidden" name="reason" value={reason} /> : null}
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
            href="/lost"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {reasons.length > 1 || reason ? (
        <nav aria-label="Lost reasons" className="flex flex-wrap gap-2">
          {reasons.map((item) => (
            <Link
              key={item.label}
              href={chipHref(item.label)}
              aria-current={item.label === reason ? "true" : undefined}
              className={
                item.label === reason
                  ? "border-accent bg-accent/10 text-foreground rounded-md border px-2.5 py-1 text-xs"
                  : "border-border text-muted-foreground hover:text-foreground rounded-md border px-2.5 py-1 text-xs"
              }
            >
              {item.label} <span className="num">{item.count}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No lost deals match these filters. Try fewer words or clear the filters."
              : "No lost deals yet. Deals you move to Lost show up here with their reason."
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
        <>
          <p className="text-muted-foreground text-sm">
            <span className="num">{rows.length}</span>{" "}
            {rows.length === 1 ? "deal" : "deals"} ·{" "}
            <span className="num">{formatCents(lostCents)}</span> lost
          </p>
          <DataTable>
            <thead>
              <tr>
                <Th>Lost</Th>
                <Th>Deal</Th>
                <Th>Company</Th>
                <Th>Reason</Th>
                <Th className="text-right">Value</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((deal) => (
                <Tr key={deal.id}>
                  <Td className="num whitespace-nowrap">
                    {deal.days === 0
                      ? "Today"
                      : deal.days === 1
                        ? "1 day ago"
                        : `${deal.days} days ago`}
                  </Td>
                  <Td className="font-medium">{deal.title}</Td>
                  <Td>
                    <Link
                      href={`/companies/${deal.companyId}`}
                      className="hover:underline"
                    >
                      {deal.companyName}
                    </Link>{" "}
                    <BusinessBadge business={deal.business} />
                  </Td>
                  <Td className="text-muted-foreground max-w-64">
                    {deal.reasonLabel}
                  </Td>
                  <Td className="num text-right whitespace-nowrap">
                    {formatCents(deal.amountCents)}
                    {deal.billing === "monthly" ? (
                      <Badge tone="neutral" className="ml-1.5">
                        monthly
                      </Badge>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <form action={reopen}>
                        <input type="hidden" name="id" value={deal.id} />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          aria-label={`Reopen ${deal.title}`}
                        >
                          Reopen
                        </Button>
                      </form>
                      <form action={revisit} className="flex gap-1">
                        <input type="hidden" name="dealId" value={deal.id} />
                        {[30, 90].map((days) => (
                          <Button
                            key={days}
                            type="submit"
                            name="days"
                            value={days}
                            variant="secondary"
                            size="sm"
                            aria-label={`Revisit ${deal.title} in ${days} days`}
                          >
                            In {days} days
                          </Button>
                        ))}
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
      {all.length >= LOST_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the {LOST_CAP} most recent lost deals. Filter by business or
          search to narrow the list.
        </p>
      ) : null}
    </div>
  );
}
