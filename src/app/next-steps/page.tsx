import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge, StatusBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  firstProblem,
  formObject,
  nextStepInput,
  withProblem,
} from "@/lib/action-input";
import { daysSince } from "@/lib/stalled";
import {
  NO_NEXT_STEP_CAP,
  getCompany,
  listWithoutNextStep,
} from "@/server/db/companies";
import { BUSINESSES } from "@/server/db/schema";
import { scheduleNextStep } from "@/server/db/tasks";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;

const OPTIONS = [
  { days: 1, label: "Tomorrow" },
  { days: 3, label: "In 3 days" },
  { days: 7, label: "Next week" },
] as const;

export default async function NextStepsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const business = BUSINESSES.find((value) => value === params.business);
  const scheduled =
    typeof params.scheduled === "string" ? params.scheduled : "";

  const query = new URLSearchParams();
  if (business) query.set("business", business);
  if (q) query.set("q", q);
  const here = query.size ? `/next-steps?${query}` : "/next-steps";

  async function schedule(formData: FormData) {
    "use server";
    const parsed = nextStepInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    const { companyId, days } = parsed.data;
    const company = await getCompany(companyId);
    if (!company || company.archivedAt)
      redirect(
        withProblem(
          here,
          "That company is no longer available. Reload the list.",
        ),
      );
    await scheduleNextStep(companyId, days);
    const next = new URLSearchParams(query);
    next.set("scheduled", company.name);
    redirect(`/next-steps?${next}`);
  }

  const rows = (await listWithoutNextStep({ business, q: q || undefined })).map(
    (row) => ({ ...row, days: daysSince(row.lastActivityAt) }),
  );
  const hasFilters = Boolean(q || business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="No next step"
        description="Prospects and clients with no open follow-up and no meeting coming up. Schedule a follow-up here, or open a row to plan something more specific."
      />

      {scheduled ? (
        <p role="status" className="text-success text-sm">
          Follow-up added for {scheduled}.
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
            href="/next-steps"
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
              ? "No companies match these filters. Try fewer words or clear the filters."
              : "Every prospect and client has a next step. Nice."
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
        <DataTable>
          <thead>
            <tr>
              <Th>Last activity</Th>
              <Th>Company</Th>
              <Th>Status</Th>
              <Th className="text-right">Open deals</Th>
              <Th>Schedule a follow-up</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="num whitespace-nowrap">
                  {row.days === 0
                    ? "Today"
                    : row.days === 1
                      ? "1 day ago"
                      : `${row.days} days ago`}
                </Td>
                <Td className="font-medium">
                  <Link
                    href={`/companies/${row.id}`}
                    className="hover:underline"
                  >
                    {row.name}
                  </Link>{" "}
                  <BusinessBadge business={row.business} />
                </Td>
                <Td>
                  <StatusBadge status={row.status} />
                </Td>
                <Td className="num text-right">{row.openDeals}</Td>
                <Td>
                  <form action={schedule} className="flex flex-wrap gap-1">
                    <input type="hidden" name="companyId" value={row.id} />
                    {OPTIONS.map((option) => (
                      <Button
                        key={option.days}
                        type="submit"
                        name="days"
                        value={option.days}
                        variant="secondary"
                        size="sm"
                        aria-label={`${option.label}: follow up with ${row.name}`}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </form>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {rows.length >= NO_NEXT_STEP_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the first {NO_NEXT_STEP_CAP} companies. Filter by business or
          search to narrow the list.
        </p>
      ) : null}
    </div>
  );
}
