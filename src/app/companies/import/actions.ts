"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { firstProblem } from "@/lib/action-input";
import { IMPORT_FIELDS } from "@/lib/import";
import { importCompaniesAndContacts } from "@/server/db/import";
import { BUSINESSES } from "@/server/db/schema";

const MAX_IMPORT_ROWS = 5000;

const columnIndex = z.number().int().min(0).nullable();

const importInput = z.object({
  business: z.enum(BUSINESSES, { error: "Choose Statixx or Trazo." }),
  rows: z
    .array(z.array(z.string()))
    .min(1, "That file has no data rows to import.")
    .max(
      MAX_IMPORT_ROWS,
      `Import up to ${MAX_IMPORT_ROWS} rows at a time. Split the file and import it in parts.`,
    ),
  mapping: z
    .object(
      Object.fromEntries(IMPORT_FIELDS.map((f) => [f, columnIndex])) as Record<
        (typeof IMPORT_FIELDS)[number],
        typeof columnIndex
      >,
    )
    .refine(
      (m) => m.companyName !== null,
      "Match a column to Company name before importing.",
    ),
});

// Returns a message instead of throwing so the page can show it inline.
export async function runImport(input: unknown): Promise<{ error: string }> {
  const parsed = importInput.safeParse(input);
  if (!parsed.success) return { error: firstProblem(parsed.error) };

  let result;
  try {
    result = await importCompaniesAndContacts(
      parsed.data.business,
      parsed.data.rows,
      parsed.data.mapping,
    );
  } catch {
    return {
      error:
        "The import didn't finish. Some rows may already be saved, so check the companies list, then try again.",
    };
  }

  const params = new URLSearchParams({
    imported: String(result.imported),
    skipped: String(result.skipped),
    contacts: String(result.contactsImported),
  });
  redirect(`/companies?${params.toString()}`);
}
