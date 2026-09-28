import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { archiveCompany, getCompany } from "@/server/db/companies";
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

  async function archive() {
    "use server";
    await archiveCompany(companyId);
    redirect("/companies");
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

      <Link href="/companies" className="text-sm text-zinc-500 hover:underline">
        ← Back to companies
      </Link>
    </div>
  );
}
