import Link from "next/link";
import { redirect } from "next/navigation";

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
  nextStepInput,
  withProblem,
} from "@/lib/action-input";
import { daysSince } from "@/lib/stalled";
import {
  NO_DEAL_CAP,
  getCompany,
  listProspectsWithoutDeal,
} from "@/server/db/companies";
import { createDeal } from "@/server/db/deals";
import { BUSINESSES } from "@/server/db/schema";
import { scheduleNextStep } from "@/server/db/tasks";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

export default async function NoDealPage({
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
  const here = query.size ? `/no-deal?${query}` : "/no-deal";

  async function startDeal(formData: FormData) {
    "use server";
    const parsed = idInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    const company = await getCompany(parsed.data.id);
    if (!company)
      redirect(
        withProblem(here, "That company no longer exists. Reload the list."),
      );
    await createDeal(company.id, {
      title: company.name,
      amountCents: 0,
      billing: "one_time",
      closeDate: null,
    });
    const next = new URLSearchParams(query);
    next.set(
      "done",
      `Deal started for ${company.name}. Set its value on the deals board.`,
    );
    redirect(`/no-deal?${next}`);
  }

  async function followUp(formData: FormData) {
    "use server";
    const parsed = nextStepInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    await scheduleNextStep(parsed.data.companyId, parsed.data.days);
    const next = new URLSearchParams(query);
    next.set(
      "done",
      `Follow-up added for ${parsed.data.days === 1 ? "tomorrow" : `${parsed.data.days} days from now`}.`,
    );
    redirect(`/no-deal?${next}`);
  }

  const rows = (
    await listProspectsWithoutDeal({ business, q: q || undefined })
  ).map((company) => ({ ...company, days: daysSince(company.lastActivityAt) }));
  const hasFilters = Boolean(q || business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Prospects without a deal"
        description="Prospects that have no open deal, quietest first. Start a deal to put one on the board, or add a follow-up to keep the conversation going."
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
            Search companies
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Company name"
            className="w-72"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {hasFilters ? (
          <Link
            href="/no-deal"
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
              ? "No prospects match these filters. Try fewer words or clear the filters."
              : "Every prospect has an open deal. Add new prospects on the companies page."
          }
          action={
            <Link
              href="/companies"
              className="text-accent text-sm font-medium hover:underline"
            >
              Go to companies
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            <span className="num">{rows.length}</span>{" "}
            {rows.length === 1 ? "prospect" : "prospects"} without an open deal
          </p>
          <DataTable>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Last touched</Th>
                <Th>Contacts</Th>
                <Th>Follow-ups</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((company) => (
                <Tr key={company.id}>
                  <Td>
                    <Link
                      href={`/companies/${company.id}`}
                      className="font-medium hover:underline"
                    >
                      {company.name}
                    </Link>{" "}
                    <BusinessBadge business={company.business} />
                    {company.lostDeals > 0 ? (
                      <Badge tone="neutral" className="ml-1.5">
                        {company.lostDeals} lost
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="num text-muted-foreground whitespace-nowrap">
                    {company.days === 0
                      ? "Today"
                      : company.days === 1
                        ? "1 day ago"
                        : `${company.days} days ago`}
                  </Td>
                  <Td className="num">{company.contacts}</Td>
                  <Td className="num">{company.openTasks}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <form action={startDeal}>
                        <input type="hidden" name="id" value={company.id} />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          aria-label={`Start a deal for ${company.name}`}
                        >
                          Start deal
                        </Button>
                      </form>
                      <form action={followUp} className="flex gap-1">
                        <input
                          type="hidden"
                          name="companyId"
                          value={company.id}
                        />
                        {[1, 7].map((days) => (
                          <Button
                            key={days}
                            type="submit"
                            name="days"
                            value={days}
                            variant="secondary"
                            size="sm"
                            aria-label={`Follow up with ${company.name} ${days === 1 ? "tomorrow" : "in a week"}`}
                          >
                            {days === 1 ? "Tomorrow" : "In a week"}
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
      {rows.length >= NO_DEAL_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the {NO_DEAL_CAP} quietest prospects. Filter by business or
          search to narrow the list.
        </p>
      ) : null}
    </div>
  );
}
