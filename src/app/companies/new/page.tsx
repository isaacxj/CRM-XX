import { redirect } from "next/navigation";

import { createCompany } from "@/server/db/companies";
import { BUSINESSES, COMPANY_STATUSES } from "@/server/db/schema";
import { CompanyForm } from "../company-form";

export default function NewCompanyPage() {
  async function create(formData: FormData) {
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

    const company = await createCompany({
      business: business as (typeof BUSINESSES)[number],
      name: name.trim(),
      website:
        typeof website === "string" && website.trim() ? website.trim() : null,
      status: status as (typeof COMPANY_STATUSES)[number],
      source:
        typeof source === "string" && source.trim() ? source.trim() : null,
    });

    redirect(`/companies/${company.id}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Add company</h1>
      <CompanyForm action={create} submitLabel="Add company" />
    </div>
  );
}
