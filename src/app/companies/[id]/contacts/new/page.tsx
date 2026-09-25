import { notFound, redirect } from "next/navigation";

import { getCompany } from "@/server/db/companies";
import { createContact } from "@/server/db/contacts";
import { ContactForm } from "../../../contact-form";

export default async function NewContactPage({
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

  async function create(formData: FormData) {
    "use server";

    const name = formData.get("name");
    const title = formData.get("title");
    const email = formData.get("email");
    const phone = formData.get("phone");

    if (typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Name is required.");
    }

    await createContact(companyId, {
      name: name.trim(),
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      email: typeof email === "string" && email.trim() ? email.trim() : null,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : null,
    });

    redirect(`/companies/${companyId}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Add contact to {company.name}</h1>
      <ContactForm action={create} submitLabel="Add contact" />
    </div>
  );
}
