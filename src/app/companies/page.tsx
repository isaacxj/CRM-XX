import Link from "next/link";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { Avatar } from "@/components/kit/avatar";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge, StatusBadge } from "@/components/kit/status-badges";
import { CompanySheet } from "@/components/forms/company-sheet";
import { ToastOnMount } from "@/components/kit/toast";
import { createCompanyAction } from "@/app/form-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDaysAgo } from "@/lib/activity";
import { listCompanies } from "@/server/db/companies";
import {
  BUSINESSES,
  COMPANY_STATUSES,
  type Business,
  type CompanyStatus,
} from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const STATUS_LABEL: Record<CompanyStatus, string> = {
  prospect: "Prospect",
  client: "Client",
  past: "Past client",
};

function isBusiness(value: string): value is Business {
  return (BUSINESSES as readonly string[]).includes(value);
}

function isStatus(value: string): value is CompanyStatus {
  return (COMPANY_STATUSES as readonly string[]).includes(value);
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const businessParam =
    typeof params.business === "string" ? params.business : "";
  const statusParam = typeof params.status === "string" ? params.status : "";
  const q = typeof params.q === "string" ? params.q : "";
  const importedParam =
    typeof params.imported === "string" ? Number(params.imported) : null;
  const skippedParam =
    typeof params.skipped === "string" ? Number(params.skipped) : null;
  const contactsParam =
    typeof params.contacts === "string" ? Number(params.contacts) : null;

  const business = isBusiness(businessParam) ? businessParam : undefined;
  const status = isStatus(statusParam) ? statusParam : undefined;
  const focusSearch = params.focus === "1";
  const sheetOpen = params.new === "1";
  const closeParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k !== "new" && typeof v === "string") closeParams.set(k, v);
  }
  const closeHref = closeParams.size
    ? `/companies?${closeParams}`
    : "/companies";
  const sort = params.sort === "last_activity" ? "last_activity" : "name";
  const dir = params.dir === "desc" ? "desc" : "asc";

  const companies = await listCompanies({
    business,
    status,
    q: q || undefined,
    sort,
    dir,
  });

  // Clicking Last activity sorts stalest first, then flips.
  const sortParams = new URLSearchParams();
  if (business) sortParams.set("business", business);
  if (status) sortParams.set("status", status);
  if (q) sortParams.set("q", q);
  sortParams.set("sort", "last_activity");
  sortParams.set(
    "dir",
    sort === "last_activity" && dir === "asc" ? "desc" : "asc",
  );

  const selectCls =
    "border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm";
  const importMessage =
    importedParam !== null
      ? `Imported ${importedParam} ${importedParam === 1 ? "company" : "companies"}` +
        (contactsParam
          ? ` and ${contactsParam} contact${contactsParam === 1 ? "" : "s"}`
          : "") +
        (skippedParam
          ? `. Skipped ${skippedParam} row${skippedParam === 1 ? "" : "s"} that were missing a name or already existed.`
          : ".")
      : null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      {importMessage && <ToastOnMount message={importMessage} />}
      {sheetOpen && (
        <CompanySheet
          action={createCompanyAction}
          closeHref={closeHref}
          defaultBusiness={business ?? "statixx"}
        />
      )}
      <PageHeader
        title="Companies"
        description={`${companies.length} ${companies.length === 1 ? "company" : "companies"}`}
        actions={
          <>
            <Link
              href="/companies/import"
              className={buttonVariants({ variant: "secondary" })}
            >
              Import CSV
            </Link>
            <Link href="/companies?new=1" className={buttonVariants()}>
              Add company
            </Link>
          </>
        }
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
            className={selectCls}
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
          <label htmlFor="status" className="text-muted-foreground text-xs">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className={selectCls}
          >
            <option value="">All</option>
            {COMPANY_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs">
            Search by name
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Company name"
            autoFocus={focusSearch}
            className="w-56"
          />
        </div>
        {sort === "last_activity" && (
          <>
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />
          </>
        )}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {companies.length === 0 ? (
        <EmptyState
          title="No companies match these filters yet. Add one or import a CSV to get started."
          action={
            <Link href="/companies?new=1" className={buttonVariants()}>
              Add company
            </Link>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Business</Th>
              <Th>Status</Th>
              <Th>Website</Th>
              <Th
                href={`/companies?${sortParams.toString()}`}
                sort={sort === "last_activity" ? dir : "none"}
              >
                Last activity
              </Th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <Tr key={company.id} href={`/companies/${company.id}`}>
                <Td>
                  <Link
                    href={`/companies/${company.id}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <Avatar name={company.name} size="sm" />
                    {company.name}
                  </Link>
                </Td>
                <Td>
                  <BusinessBadge business={company.business} />
                </Td>
                <Td>
                  <StatusBadge status={company.status} />
                </Td>
                <Td className="text-muted-foreground">
                  {company.website ?? "—"}
                </Td>
                <Td className="num text-muted-foreground">
                  {formatDaysAgo(company.lastActivityAt)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
