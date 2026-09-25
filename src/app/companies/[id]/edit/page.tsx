import { notFound, redirect } from "next/navigation";

import { getCompany, updateCompany } from "@/server/db/companies";
import { BUSINESSES, COMPANY_STATUSES } from "@/server/db/schema";
import { CompanyForm } from "../../company-form";

export default async function EditCompanyPage({
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

  async function update(formData: FormData) {
    "use server";

    const business = formData.get("business");
    const name = formData.get("name");
    const website = formData.get("website");
    const status = formData.get("status");
    const source = formData.get("source");

    if (
      typeof business !== "string" ||
      !(BUSINESSES as readonly string[]).includes(business) ||
      typeof name !== "string" ||
      name.trim().length === 0 ||
      typeof status !== "string" ||
      !(COMPANY_STATUSES as readonly string[]).includes(status)
    ) {
      throw new Error("Business, name, and status are required.");
    }

    await updateCompany(companyId, {
      business: business as (typeof BUSINESSES)[number],
      name: name.trim(),
      website:
        typeof website === "string" && website.trim() ? website.trim() : null,
      status: status as (typeof COMPANY_STATUSES)[number],
      source:
        typeof source === "string" && source.trim() ? source.trim() : null,
    });

    redirect(`/companies/${companyId}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Edit {company.name}</h1>
      <CompanyForm
        action={update}
        submitLabel="Save changes"
        defaultValues={company}
      />
    </div>
  );
}
