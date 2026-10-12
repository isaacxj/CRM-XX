import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkInInput,
  firstProblem,
  formObject,
  withProblem,
} from "@/lib/action-input";
import { daysSince } from "@/lib/stalled";
import {
  QUIET_CLIENTS_CAP,
  getCompany,
  listQuietClients,
} from "@/server/db/companies";
import { BUSINESSES } from "@/server/db/schema";
import { scheduleCheckIn } from "@/server/db/tasks";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;
const QUIET_OPTIONS = [30, 60, 90] as const;

const OPTIONS = [
  { days: 1, label: "Tomorrow" },
  { days: 7, label: "In a week" },
  { days: 30, label: "In a month" },
] as const;

export default async function CheckInsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const business = BUSINESSES.find((value) => value === params.business);
  const quiet =
    QUIET_OPTIONS.find((value) => String(value) === params.quiet) ?? 30;
  const scheduled =
    typeof params.scheduled === "string" ? params.scheduled : "";

  const query = new URLSearchParams();
  if (business) query.set("business", business);
  if (q) query.set("q", q);
  if (quiet !== 30) query.set("quiet", String(quiet));
  const here = query.size ? `/check-ins?${query}` : "/check-ins";

  async function schedule(formData: FormData) {
    "use server";
    const parsed = checkInInput.safeParse(formObject(formData));
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
    await scheduleCheckIn(companyId, days);
    const next = new URLSearchParams(query);
    next.set("scheduled", company.name);
    redirect(`/check-ins?${next}`);
  }

  const rows = (
    await listQuietClients({ business, days: quiet, q: q || undefined })
  ).map((row) => ({ ...row, days: daysSince(row.lastActivityAt) }));
  const hasFilters = Boolean(q || business || quiet !== 30);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Client check-ins"
        description="Clients nobody has touched in a while. Schedule a check-in, or open the company to log a call or email."
      />

      {scheduled ? (
        <p role="status" className="text-success text-sm">
          Check-in added for {scheduled}.
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
          <label htmlFor="quiet" className="text-muted-foreground text-xs">
            Quiet for
          </label>
          <select
            id="quiet"
            name="quiet"
            defaultValue={String(quiet)}
            className="border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm"
          >
            {QUIET_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} days or more
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs">
            Search clients
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
            href="/check-ins"
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
              ? "No clients match these filters. Try a shorter quiet period or clear the filters."
              : "No client has been quiet for 30 days. Every client was touched recently."
          }
          action={
            <Link
              href="/companies?status=client"
              className="text-accent text-sm font-medium hover:underline"
            >
              See clients
            </Link>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Last activity</Th>
              <Th>Client</Th>
              <Th className="text-right">Open deals</Th>
              <Th>Follow-up</Th>
              <Th>Schedule a check-in</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Tr key={row.id}>
                <Td className="num whitespace-nowrap">
                  {row.days === 1 ? "1 day ago" : `${row.days} days ago`}
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
                <Td className="num text-right">{row.openDeals}</Td>
                <Td className="text-muted-foreground">
                  {row.openTasks > 0 ? `${row.openTasks} open` : "None planned"}
                </Td>
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
                        aria-label={`${option.label}: check in with ${row.name}`}
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
      {rows.length >= QUIET_CLIENTS_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the first {QUIET_CLIENTS_CAP} clients. Filter by business or
          search to narrow the list.
        </p>
      ) : null}
    </div>
  );
}
