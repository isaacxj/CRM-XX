import Link from "next/link";

import { listContacts } from "@/server/db/contacts";
import type { Business } from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  const contacts = await listContacts({ q: q || undefined });

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Contacts</h1>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-zinc-500">
            Search by name
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Contact name"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Filter
        </button>
      </form>

      {contacts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No contacts match this search. Add one from a company page.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Title</th>
              <th className="py-2 font-medium">Company</th>
              <th className="py-2 font-medium">Business</th>
              <th className="py-2 font-medium">Email</th>
              <th className="py-2 font-medium">Phone</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 font-medium">{contact.name}</td>
                <td className="py-2 text-zinc-500">{contact.title ?? "—"}</td>
                <td className="py-2">
                  <Link
                    href={`/companies/${contact.companyId}`}
                    className="hover:underline"
                  >
                    {contact.companyName}
                  </Link>
                </td>
                <td className="py-2">{BUSINESS_LABEL[contact.business]}</td>
                <td className="py-2 text-zinc-500">{contact.email ?? "—"}</td>
                <td className="py-2 text-zinc-500">{contact.phone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
