"use server";

import { redirect } from "next/navigation";

import type { ImportMapping } from "@/lib/import";
import { importCompaniesAndContacts } from "@/server/db/import";
import type { Business } from "@/server/db/schema";

export async function runImport(
  business: Business,
  rows: string[][],
  mapping: ImportMapping,
) {
  const result = await importCompaniesAndContacts(business, rows, mapping);

  const params = new URLSearchParams({
    imported: String(result.imported),
    skipped: String(result.skipped),
    contacts: String(result.contactsImported),
  });
  redirect(`/companies?${params.toString()}`);
}
