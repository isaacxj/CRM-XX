import Link from "next/link";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { Avatar } from "@/components/kit/avatar";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/kit/pagination";
import { pageWindow, parsePage } from "@/lib/pagination";
import {
  countContacts,
  listContacts,
  type ContactFilters,
  type ContactSort,
} from "@/server/db/contacts";
import { BUSINESSES, type Business } from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};
const SORTS: ContactSort[] = ["name", "company", "title"];

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const focusSearch = params.focus === "1";
  const business = BUSINESSES.find((value) => value === params.business);
  const sort = SORTS.find((value) => value === params.sort) ?? "name";
  const dir = params.dir === "desc" ? "desc" : "asc";

  const filters: ContactFilters = {
    q: q || undefined,
    business,
    sort,
    dir,
  };
  const total = await countContacts(filters);
  const window = pageWindow(parsePage(params.page), total);
  const contacts = await listContacts({
    ...filters,
    limit: window.limit,
    offset: window.offset,
  });

  const hrefWith = (overrides: Record<string, string>, page = 1) => {
    const next = new URLSearchParams();
    if (business) next.set("business", business);
    if (q) next.set("q", q);
    if (sort !== "name" || dir !== "asc") {
      next.set("sort", sort);
      next.set("dir", dir);
    }
    for (const [key, value] of Object.entries(overrides)) next.set(key, value);
    if (page > 1) next.set("page", String(page));
    return next.size ? `/contacts?${next}` : "/contacts";
  };
  // Clicking the active column flips its direction; a new column starts A to Z.
  const sortHref = (column: ContactSort) =>
    hrefWith({
      sort: column,
      dir: sort === column && dir === "asc" ? "desc" : "asc",
    });
  const sortState = (column: ContactSort) => (sort === column ? dir : "none");
  const hasFilters = Boolean(q || business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Contacts"
        description="Everyone you talk to, across both businesses. Open a row to go to their company."
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
            Search contacts
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, email, title or company"
            autoFocus={focusSearch}
            className="w-64"
          />
        </div>
        {sort !== "name" || dir !== "asc" ? (
          <>
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />
          </>
        ) : null}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {hasFilters ? (
          <Link
            href="/contacts"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {total === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No contacts match these filters. Try part of a name, email or company, or clear the filters."
              : "No contacts yet. Add one from a company page, or import a CSV."
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
              <Th href={sortHref("name")} sort={sortState("name")}>
                Name
              </Th>
              <Th href={sortHref("title")} sort={sortState("title")}>
                Title
              </Th>
              <Th href={sortHref("company")} sort={sortState("company")}>
                Company
              </Th>
              <Th>Business</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <Tr key={contact.id} href={`/companies/${contact.companyId}`}>
                <Td>
                  <span className="flex items-center gap-2 font-medium">
                    <Avatar name={contact.name} />
                    {contact.name}
                  </span>
                </Td>
                <Td className="text-muted-foreground">
                  {contact.title ?? "—"}
                </Td>
                <Td>
                  <Link
                    href={`/companies/${contact.companyId}`}
                    className="hover:underline"
                  >
                    {contact.companyName}
                  </Link>
                </Td>
                <Td>
                  <BusinessBadge business={contact.business} />
                </Td>
                <Td className="text-muted-foreground">
                  {contact.email ?? "—"}
                </Td>
                <Td className="text-muted-foreground num">
                  {contact.phone ?? "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
      <Pagination
        page={window.page}
        total={total}
        noun="contacts"
        hrefFor={(page) => hrefWith({}, page)}
      />
    </div>
  );
}
