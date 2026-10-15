"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { zodErrors, type FormState } from "@/lib/form-state";
import { IMPORT_FIELDS } from "@/lib/import";
import {
  importCompaniesAndContacts,
  previewImport,
  type ImportPreview,
} from "@/server/db/import";
import { BUSINESSES } from "@/server/db/schema";

const MAX_ROWS = 5000;

const importSchema = z.object({
  business: z.enum(BUSINESSES, { error: "Choose Statixx or Trazo." }),
  rows: z
    .array(z.array(z.string()))
    .min(1, "The file has no data rows.")
    .max(MAX_ROWS, `Import up to ${MAX_ROWS} rows at a time; split the file.`),
  mapping: z
    .object(
      Object.fromEntries(
        IMPORT_FIELDS.map((field) => [
          field,
          z.number().int().min(0).nullable(),
        ]),
      ) as Record<(typeof IMPORT_FIELDS)[number], z.ZodNullable<z.ZodNumber>>,
    )
    .refine((m) => m.companyName !== null, {
      message: "Match a column to Company name.",
    }),
});

export async function previewImportAction(
  input: unknown,
): Promise<ImportPreview | null> {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return null;
  const { business, rows, mapping } = parsed.data;
  return previewImport(business, rows, mapping);
}

export async function runImport(input: unknown): Promise<FormState> {
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return zodErrors(parsed.error);
  const { business, rows, mapping } = parsed.data;
  const result = await importCompaniesAndContacts(business, rows, mapping);

  const params = new URLSearchParams({
    imported: String(result.imported),
    skipped: String(result.skipped),
    contacts: String(result.contactsImported),
  });
  redirect(`/companies?${params.toString()}`);
}
