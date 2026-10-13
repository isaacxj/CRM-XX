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
  winBackInput,
  withProblem,
} from "@/lib/action-input";
import { daysSince } from "@/lib/stalled";
import {
  WIN_BACK_CAP,
  getCompany,
  listPastClients,
  updateCompanyFields,
} from "@/server/db/companies";
import { BUSINESSES } from "@/server/db/schema";
import { createTask } from "@/server/db/tasks";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;
const WIN_BACK_DAYS = [
  { days: 7, label: "In a week" },
  { days: 30, label: "In 30 days" },
  { days: 90, label: "In 90 days" },
];

export default async function WinBackPage({
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
  const here = query.size ? `/win-back?${query}` : "/win-back";

  async function reopen(formData: FormData) {
    "use server";
    const parsed = idInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    const company = await getCompany(parsed.data.id);
    if (!company)
      redirect(
        withProblem(here, "That company no longer exists. Reload the list."),
      );
    await updateCompanyFields(company.id, { status: "prospect" });
    const next = new URLSearchParams(query);
    next.set("done", `${company.name} is a prospect again.`);
    redirect(`/win-back?${next}`);
  }

  async function followUp(formData: FormData) {
    "use server";
    const parsed = winBackInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + parsed.data.days);
    await createTask(parsed.data.companyId, {
      title: "Win back",
      dueDate: due.toISOString().slice(0, 10),
    });
    const next = new URLSearchParams(query);
    next.set(
      "done",
      `Win back follow-up added for ${parsed.data.days} days from now.`,
    );
    redirect(`/win-back?${next}`);
  }

  const rows = (await listPastClients({ business, q: q || undefined })).map(
    (company) => ({ ...company, days: daysSince(company.lastActivityAt) }),
  );
  const hasFilters = Boolean(q || business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Win back"
        description="Past clients, biggest first. Reopen one as a prospect to work it again, or add a follow-up so you reach out at the right time."
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
            href="/win-back"
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
              ? "No past clients match these filters. Try fewer words or clear the filters."
              : "No past clients yet. Set a company's status to Past client on its page when a client leaves."
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
            <span className="num">{rows.length}</span> past{" "}
            {rows.length === 1 ? "client" : "clients"}
          </p>
          <DataTable>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Bought before</Th>
                <Th>Last touched</Th>
                <Th>Open</Th>
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
                  </Td>
                  <Td className="num whitespace-nowrap">
                    {company.wonDeals === 0 ? (
                      <span className="text-muted-foreground">
                        No won deals
                      </span>
                    ) : (
                      <>
                        {formatCents(company.wonCents)}
                        <span className="text-muted-foreground">
                          {" "}
                          · {company.wonDeals}{" "}
                          {company.wonDeals === 1 ? "deal" : "deals"}
                        </span>
                        {company.monthlyCents > 0 ? (
                          <Badge tone="neutral" className="ml-1.5">
                            {formatCents(company.monthlyCents)}/mo
                          </Badge>
                        ) : null}
                      </>
                    )}
                  </Td>
                  <Td className="num text-muted-foreground whitespace-nowrap">
                    {company.days === 0
                      ? "Today"
                      : company.days === 1
                        ? "1 day ago"
                        : `${company.days} days ago`}
                  </Td>
                  <Td className="num text-muted-foreground whitespace-nowrap">
                    {company.openDeals} deals · {company.openTasks} follow-ups
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <form action={reopen}>
                        <input type="hidden" name="id" value={company.id} />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          aria-label={`Reopen ${company.name} as a prospect`}
                        >
                          Reopen as prospect
                        </Button>
                      </form>
                      <form action={followUp} className="flex gap-1">
                        <input
                          type="hidden"
                          name="companyId"
                          value={company.id}
                        />
                        {WIN_BACK_DAYS.map(({ days, label }) => (
                          <Button
                            key={days}
                            type="submit"
                            name="days"
                            value={days}
                            variant="secondary"
                            size="sm"
                            aria-label={`Follow up with ${company.name} ${label.toLowerCase()}`}
                          >
                            {label}
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
      {rows.length >= WIN_BACK_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the {WIN_BACK_CAP} biggest past clients. Filter by business or
          search to narrow the list.
        </p>
      ) : null}
    </div>
  );
}
