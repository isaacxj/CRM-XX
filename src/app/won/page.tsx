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
import { WON_CAP, getDealDetail, listWonDeals } from "@/server/db/deals";
import { updateCompanyFields } from "@/server/db/companies";
import { BUSINESSES } from "@/server/db/schema";
import { createTask } from "@/server/db/tasks";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

export default async function WonDealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const business = BUSINESSES.find((value) => value === params.business);
  const done = typeof params.done === "string" ? params.done : "";

  const query = new URLSearchParams();
  if (business) query.set("business", business);
  if (q) query.set("q", q);
  const here = query.size ? `/won?${query}` : "/won";

  async function makeClient(formData: FormData) {
    "use server";
    const parsed = idInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    await updateCompanyFields(parsed.data.id, { status: "client" });
    const next = new URLSearchParams(query);
    next.set("done", "Company marked as a client.");
    redirect(`/won?${next}`);
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
      title: `Check in on won deal: ${deal.title}`,
      dueDate: due.toISOString().slice(0, 10),
    });
    const next = new URLSearchParams(query);
    next.set("done", `Check-in added for ${parsed.data.days} days from now.`);
    redirect(`/won?${next}`);
  }

  const rows = (await listWonDeals({ business, q: q || undefined })).map(
    (deal) => ({ ...deal, days: daysSince(deal.wonAt) }),
  );
  const wonCents = rows.reduce((sum, deal) => sum + deal.amountCents, 0);
  const monthlyCents = rows
    .filter((deal) => deal.billing === "monthly")
    .reduce((sum, deal) => sum + deal.amountCents, 0);
  const hasFilters = Boolean(q || business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Won deals"
        description="Deals you won, newest first, with how long they took. Mark the company as a client if it is still a prospect, or schedule a check-in for 30 or 90 days out."
      />

      {done ? (
        <p role="status" className="text-success text-sm">
          {done}
        </p>
      ) : null}

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
            href="/won"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No won deals match these filters. Try fewer words or clear the filters."
              : "No won deals yet. Deals you move to Won show up here."
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
            <span className="num">{formatCents(wonCents)}</span> won
            {monthlyCents > 0 ? (
              <>
                {" "}
                (<span className="num">{formatCents(monthlyCents)}</span> a
                month)
              </>
            ) : null}
          </p>
          <DataTable>
            <thead>
              <tr>
                <Th>Won</Th>
                <Th>Deal</Th>
                <Th>Company</Th>
                <Th>Time to win</Th>
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
                  <Td className="num text-muted-foreground whitespace-nowrap">
                    {deal.daysToWin === 1 ? "1 day" : `${deal.daysToWin} days`}
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
                      {deal.companyStatus === "prospect" ? (
                        <form action={makeClient}>
                          <input
                            type="hidden"
                            name="id"
                            value={deal.companyId}
                          />
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            aria-label={`Make ${deal.companyName} a client`}
                          >
                            Make client
                          </Button>
                        </form>
                      ) : null}
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
                            aria-label={`Check in on ${deal.title} in ${days} days`}
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
      {rows.length >= WON_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the {WON_CAP} most recent won deals. Filter by business or
          search to narrow the list.
        </p>
      ) : null}
    </div>
  );
}
