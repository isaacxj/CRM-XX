import Link from "next/link";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { Avatar } from "@/components/kit/avatar";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge, StatusBadge } from "@/components/kit/status-badges";
import { CompanySheet } from "@/components/forms/company-sheet";
import { ToastOnMount, UndoToastOnMount } from "@/components/kit/toast";
import { createCompanyAction } from "@/app/form-actions";
import {
  bulkCompaniesAction,
  deleteCompanyViewAction,
  saveCompanyViewAction,
  undoBulkArchiveAction,
} from "./bulk-actions";
import { BulkBar, SelectAll } from "@/components/kit/bulk-select";
import { listSavedViews } from "@/server/db/savedViews";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDaysAgo } from "@/lib/activity";
import { revalidatePath } from "next/cache";
import { Pagination } from "@/components/kit/pagination";
import { pageWindow, parsePage } from "@/lib/pagination";
import {
  countCompanies,
  type CompanyFilters,
  getCompany,
  listCompanies,
  restoreCompany,
} from "@/server/db/companies";
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

  const archivedId =
    typeof params.archived === "string" ? Number(params.archived) : NaN;
  const archived = Number.isInteger(archivedId)
    ? await getCompany(archivedId)
    : null;
  const justArchived = archived?.archivedAt ? archived : null;

  async function undoArchive() {
    "use server";
    await restoreCompany(archivedId);
    revalidatePath("/companies");
  }

  const bulkArchivedIds =
    typeof params.bulkArchived === "string"
      ? params.bulkArchived
          .split(",")
          .map(Number)
          .filter((n) => Number.isInteger(n) && n > 0)
      : [];
  const bulkMsg = typeof params.bulkMsg === "string" ? params.bulkMsg : null;

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

  const filters: CompanyFilters = {
    business,
    status,
    q: q || undefined,
    sort,
    dir,
  };
  const savedViews = await listSavedViews("companies");
  const total = await countCompanies(filters);
  const window = pageWindow(parsePage(params.page), total);
  const companies = await listCompanies({
    ...filters,
    limit: window.limit,
    offset: window.offset,
  });

  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    if (business) next.set("business", business);
    if (status) next.set("status", status);
    if (q) next.set("q", q);
    if (sort === "last_activity") {
      next.set("sort", sort);
      next.set("dir", dir);
    }
    if (page > 1) next.set("page", String(page));
    return next.size ? `/companies?${next}` : "/companies";
  };

  // Clicking Last activity sorts stalest first, then flips.
  // Where bulk and view actions return to: this list with its filters, minus
  // one-time flashes.
  const returnParams = new URLSearchParams(pageHref(window.page).split("?")[1]);
  const returnTo = returnParams.size
    ? `/companies?${returnParams}`
    : "/companies";
  const hasFilters = Boolean(business || status || q);
  const activeQuery = pageHref(1).split("?")[1] ?? "";
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
      {bulkMsg && <ToastOnMount message={bulkMsg} />}
      {bulkArchivedIds.length > 0 && (
        <UndoToastOnMount
          message={`Archived ${bulkArchivedIds.length} ${bulkArchivedIds.length === 1 ? "company" : "companies"}`}
          undo={undoBulkArchiveAction.bind(null, bulkArchivedIds)}
          undoneMessage="Restored them."
        />
      )}
      {justArchived && (
        <UndoToastOnMount
          message={`Archived ${justArchived.name}`}
          undo={undoArchive}
          undoneMessage={`Restored ${justArchived.name}`}
        />
      )}
      {sheetOpen && (
        <CompanySheet
          action={createCompanyAction}
          closeHref={closeHref}
          defaultBusiness={business ?? "statixx"}
        />
      )}
      <PageHeader
        title="Companies"
        description={`${total} ${total === 1 ? "company" : "companies"}`}
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

      {(savedViews.length > 0 || hasFilters) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {savedViews.length > 0 && (
            <span className="text-muted-foreground">Saved views</span>
          )}
          {savedViews.map((view) => (
            <span
              key={view.id}
              className="border-border-strong flex items-center rounded-md border"
            >
              <Link
                href={`/companies?${view.query}`}
                aria-current={view.query === activeQuery ? "page" : undefined}
                className={
                  "hover:bg-surface-hover rounded-l-md px-2.5 py-1.5 " +
                  (view.query === activeQuery ? "text-accent font-medium" : "")
                }
              >
                {view.name}
              </Link>
              <form action={deleteCompanyViewAction}>
                <input type="hidden" name="id" value={view.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  aria-label={`Remove saved view ${view.name}`}
                  className="text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-r-md px-2 py-1.5"
                >
                  ×
                </button>
              </form>
            </span>
          ))}
          {hasFilters && (
            <form
              action={saveCompanyViewAction}
              className="ml-auto flex items-center gap-2"
            >
              <input type="hidden" name="returnTo" value={returnTo} />
              <label htmlFor="view-name" className="sr-only">
                Saved view name
              </label>
              <Input
                id="view-name"
                name="name"
                placeholder="Name this view"
                maxLength={40}
                className="w-40"
              />
              <Button type="submit" variant="secondary">
                Save view
              </Button>
            </form>
          )}
        </div>
      )}

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

      {total === 0 ? (
        <EmptyState
          title="No companies match these filters yet. Add one or import a CSV to get started."
          action={
            <Link href="/companies?new=1" className={buttonVariants()}>
              Add company
            </Link>
          }
        />
      ) : (
        <>
          <form id="bulk-form" action={bulkCompaniesAction}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <BulkBar noun={total === 1 ? "company" : "companies"}>
              <select
                name="status"
                aria-label="New status"
                defaultValue=""
                className={selectCls}
              >
                <option value="" disabled>
                  Status…
                </option>
                {COMPANY_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                name="intent"
                value="status"
                variant="secondary"
              >
                Set status
              </Button>
              <select
                name="business"
                aria-label="New business"
                defaultValue=""
                className={selectCls}
              >
                <option value="" disabled>
                  Business…
                </option>
                {BUSINESSES.map((value) => (
                  <option key={value} value={value}>
                    {BUSINESS_LABEL[value]}
                  </option>
                ))}
              </select>
              <Button
                type="submit"
                name="intent"
                value="business"
                variant="secondary"
              >
                Move to business
              </Button>
              <Button
                type="submit"
                name="intent"
                value="archive"
                variant="secondary"
              >
                Archive
              </Button>
            </BulkBar>
          </form>
          <DataTable>
            <thead>
              <tr>
                <Th className="w-10">
                  <SelectAll label="Select all companies on this page" />
                </Th>
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
                    <input
                      type="checkbox"
                      form="bulk-form"
                      name="ids"
                      value={company.id}
                      aria-label={`Select ${company.name}`}
                      className="size-4 cursor-pointer"
                    />
                  </Td>
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
        </>
      )}
      <Pagination
        page={window.page}
        total={total}
        hrefFor={pageHref}
        noun="companies"
      />
    </div>
  );
}
