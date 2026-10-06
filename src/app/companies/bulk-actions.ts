"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { firstProblem, recordId, withProblem } from "@/lib/action-input";
import {
  BULK_MAX,
  bulkArchiveCompanies,
  bulkRestoreCompanies,
  bulkSetCompanyBusiness,
  bulkSetCompanyStatus,
} from "@/server/db/companies";
import { createSavedView, deleteSavedView } from "@/server/db/savedViews";
import { BUSINESSES, COMPANY_STATUSES } from "@/server/db/schema";

const ids = z
  .array(recordId)
  .min(1, "Select at least one company first.")
  .max(BULK_MAX, `Select at most ${BULK_MAX} companies at a time.`);

// Only same-site list addresses are accepted as a place to return to.
function listPath(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return path === "/companies" || path.startsWith("/companies?")
    ? path
    : "/companies";
}

function withParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function plural(n: number) {
  return `${n} ${n === 1 ? "company" : "companies"}`;
}

export async function bulkCompaniesAction(formData: FormData) {
  const here = listPath(formData.get("returnTo"));
  const intent = formData.get("intent");
  const parsedIds = ids.safeParse(formData.getAll("ids"));
  if (!parsedIds.success)
    redirect(withProblem(here, firstProblem(parsedIds.error)));
  const selected = parsedIds.data;

  if (intent === "archive") {
    const archived = await bulkArchiveCompanies(selected);
    redirect(withParam(here, "bulkArchived", archived.join(",")));
  }

  if (intent === "status") {
    const status = z
      .enum(COMPANY_STATUSES, { error: "Choose a status to apply." })
      .safeParse(formData.get("status"));
    if (!status.success)
      redirect(withProblem(here, firstProblem(status.error)));
    const n = await bulkSetCompanyStatus(selected, status.data);
    redirect(withParam(here, "bulkMsg", `Updated the status of ${plural(n)}.`));
  }

  if (intent === "business") {
    const business = z
      .enum(BUSINESSES, { error: "Choose a business to move them to." })
      .safeParse(formData.get("business"));
    if (!business.success)
      redirect(withProblem(here, firstProblem(business.error)));
    const n = await bulkSetCompanyBusiness(selected, business.data);
    const skipped = selected.length - n;
    redirect(
      withParam(
        here,
        "bulkMsg",
        `Moved ${plural(n)}.` +
          (skipped
            ? ` ${plural(skipped)} not moved because they have deals or were already archived.`
            : ""),
      ),
    );
  }

  redirect(withProblem(here, "Choose what to do with the selected companies."));
}

export async function undoBulkArchiveAction(idList: number[]) {
  const parsed = ids.safeParse(idList);
  if (parsed.success) await bulkRestoreCompanies(parsed.data);
}

const FILTER_KEYS = ["business", "status", "q", "sort", "dir"] as const;

const savedViewInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the view before saving it.")
    .max(40, "Keep the view name under 40 characters."),
});

export async function saveCompanyViewAction(formData: FormData) {
  const here = listPath(formData.get("returnTo"));
  const parsed = savedViewInput.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect(withProblem(here, firstProblem(parsed.error)));

  // Keep only the filter keys, so a view never stores a page number or flash.
  const current = new URL(here, "http://local").searchParams;
  const query = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = current.get(key);
    if (value) query.set(key, value);
  }
  if (query.size === 0)
    redirect(withProblem(here, "Choose a filter before saving a view."));

  await createSavedView({
    scope: "companies",
    name: parsed.data.name,
    query: query.toString(),
  });
  redirect(
    withParam(
      `/companies?${query}`,
      "bulkMsg",
      `Saved view ${parsed.data.name}.`,
    ),
  );
}

export async function deleteCompanyViewAction(formData: FormData) {
  const here = listPath(formData.get("returnTo"));
  const id = recordId.safeParse(formData.get("id"));
  if (!id.success) redirect(withProblem(here, firstProblem(id.error)));
  await deleteSavedView(id.data);
  redirect(withParam(here, "bulkMsg", "Removed the saved view."));
}
