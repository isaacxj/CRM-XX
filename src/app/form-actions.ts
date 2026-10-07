"use server";

import { redirect } from "next/navigation";

import { createActivity } from "@/server/db/activities";
import { createCompany, listCompanies } from "@/server/db/companies";
import { createContact, updateContact } from "@/server/db/contacts";
import { createDeal, updateDeal } from "@/server/db/deals";
import { createTask } from "@/server/db/tasks";
import {
  companyFormSchema,
  contactFormSchema,
  dealFormSchema,
  quickActivitySchema,
  quickFollowUpSchema,
} from "@/lib/form-schemas";
import { zodErrors, type FormState } from "@/lib/form-state";

export async function createCompanyAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = companyFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const company = await createCompany(parsed.data);
  redirect(`/companies/${company.id}?saved=company`);
}

export async function saveContactAction(
  companyId: number,
  contactId: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = contactFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  if (contactId) await updateContact(contactId, parsed.data);
  else await createContact(companyId, parsed.data);
  redirect(`/companies/${companyId}?saved=contact`);
}

export async function saveDealAction(
  companyId: number,
  dealId: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = dealFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { title, amount, billing, closeDate } = parsed.data;
  const input = {
    title,
    amountCents: Math.round(amount * 100),
    billing,
    closeDate,
  };
  if (dealId) await updateDeal(dealId, input);
  else await createDeal(companyId, input);
  redirect(`/companies/${companyId}?saved=deal`);
}

export async function logActivityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = quickActivitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { companyId, type, subject, body, occurredAt, endsAt } = parsed.data;
  if (type === "note" ? !body : !subject && !body) {
    return {
      errors: {
        body:
          type === "note"
            ? "Write what happened before saving the note."
            : "Add a subject or details before saving.",
      },
    };
  }
  await createActivity({
    companyId,
    type,
    subject: subject ?? undefined,
    body: body ?? undefined,
    occurredAt,
    endsAt,
  });
  redirect(`/companies/${companyId}?saved=activity`);
}

export async function addFollowUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = quickFollowUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { companyId, title, dueDate } = parsed.data;
  await createTask(companyId, { title, dueDate });
  redirect(`/companies/${companyId}?saved=followup`);
}

// Companies for the searchable picker in the quick-add sheets.
export async function listPickerCompanies() {
  const rows = await listCompanies({});
  return rows.map((c) => ({ id: c.id, name: c.name, business: c.business }));
}
