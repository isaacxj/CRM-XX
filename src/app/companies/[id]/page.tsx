import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { archiveCompany, getCompany } from "@/server/db/companies";
import { deleteContact, listContactsForCompany } from "@/server/db/contacts";
import type { Business, CompanyStatus } from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const STATUS_LABEL: Record<CompanyStatus, string> = {
  prospect: "Prospect",
  client: "Client",
  past: "Past client",
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  const company = Number.isInteger(companyId)
    ? await getCompany(companyId)
    : null;

  if (!company) {
    notFound();
  }

  const contacts = await listContactsForCompany(companyId);

  async function archive() {
    "use server";
    await archiveCompany(companyId);
    redirect("/companies");
  }

  async function removeContact(formData: FormData) {
    "use server";
    const contactId = Number(formData.get("contactId"));
    await deleteContact(contactId);
    redirect(`/companies/${companyId}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <p className="text-sm text-zinc-500">
            {BUSINESS_LABEL[company.business]} · {STATUS_LABEL[company.status]}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Edit
          </Link>
          <form action={archive}>
            <button
              type="submit"
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-red-600 dark:border-zinc-700"
            >
              Archive
            </button>
          </form>
        </div>
      </div>

      <dl className="grid max-w-md grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">Website</dt>
          <dd>{company.website ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Source</dt>
          <dd>{company.source ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Added</dt>
          <dd>{new Date(company.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Link
            href={`/companies/${company.id}/contacts/new`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Add contact
          </Link>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No contacts yet. Add the people you work with at this company.
          </p>
        ) : (
          <table className="w-full max-w-2xl text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Title</th>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Phone</th>
                <th className="py-2 font-medium" />
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
                  <td className="py-2 text-zinc-500">{contact.email ?? "—"}</td>
                  <td className="py-2 text-zinc-500">{contact.phone ?? "—"}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/companies/${company.id}/contacts/${contact.id}/edit`}
                        className="text-zinc-600 hover:underline dark:text-zinc-400"
                      >
                        Edit
                      </Link>
                      <form action={removeContact}>
                        <input
                          type="hidden"
                          name="contactId"
                          value={contact.id}
                        />
                        <button
                          type="submit"
                          className="text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link href="/companies" className="text-sm text-zinc-500 hover:underline">
        ← Back to companies
      </Link>
    </div>
  );
}
