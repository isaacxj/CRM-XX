import Link from "next/link";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { Avatar } from "@/components/kit/avatar";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listContacts } from "@/server/db/contacts";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const focusSearch = params.focus === "1";

  const contacts = await listContacts({ q: q || undefined });

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Contacts"
        description="Everyone you talk to, across both businesses. Open a row to go to their company."
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs">
            Search by name
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Contact name"
            autoFocus={focusSearch}
            className="w-64"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {contacts.length === 0 ? (
        <EmptyState
          title={
            q
              ? "No contacts match this search. Try part of the name, or add one from a company page."
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
              <Th>Name</Th>
              <Th>Title</Th>
              <Th>Company</Th>
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
    </div>
  );
}
