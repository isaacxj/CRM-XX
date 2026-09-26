import Link from "next/link";

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

  const companies = await listCompanies({
    business,
    status,
    q: q || undefined,
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <div className="flex gap-2">
          <Link
            href="/companies/import"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Import CSV
          </Link>
          <Link
            href="/companies/new"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add company
          </Link>
        </div>
      </div>

      {importedParam !== null && (
        <p className="rounded border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          Imported {importedParam} compan{importedParam === 1 ? "y" : "ies"}
          {contactsParam
            ? ` and ${contactsParam} contact${contactsParam === 1 ? "" : "s"}`
            : ""}
          {skippedParam
            ? `. Skipped ${skippedParam} row${skippedParam === 1 ? "" : "s"} that were missing a name or already existed.`
            : "."}
        </p>
      )}

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="business" className="text-xs text-zinc-500">
            Business
          </label>
          <select
            id="business"
            name="business"
            defaultValue={business ?? ""}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
          <label htmlFor="status" className="text-xs text-zinc-500">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
          <label htmlFor="q" className="text-xs text-zinc-500">
            Search by name
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Company name"
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

      {companies.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No companies match these filters yet. Add one to get started.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Business</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Website</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2">
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-medium hover:underline"
                  >
                    {company.name}
                  </Link>
                </td>
                <td className="py-2">{BUSINESS_LABEL[company.business]}</td>
                <td className="py-2">{STATUS_LABEL[company.status]}</td>
                <td className="py-2 text-zinc-500">{company.website ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
