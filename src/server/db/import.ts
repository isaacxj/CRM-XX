import { eq } from "drizzle-orm";

import type { ImportField, ImportMapping } from "@/lib/import";
import { getDb } from "./index";
import {
  companies,
  contacts,
  COMPANY_STATUSES,
  type Business,
  type CompanyStatus,
} from "./schema";

export type ImportResult = {
  imported: number;
  skipped: number;
  contactsImported: number;
};

function cell(row: string[], mapping: ImportMapping, field: ImportField) {
  const index = mapping[field];
  if (index === null || index === undefined) return "";
  return (row[index] ?? "").trim();
}

export async function importCompaniesAndContacts(
  business: Business,
  rows: string[][],
  mapping: ImportMapping,
): Promise<ImportResult> {
  const db = getDb();

  const existingCompanies = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.business, business));
  const seenNames = new Set(existingCompanies.map((c) => c.name.toLowerCase()));

  let imported = 0;
  let skipped = 0;
  let contactsImported = 0;

  for (const row of rows) {
    const name = cell(row, mapping, "companyName");
    if (!name || seenNames.has(name.toLowerCase())) {
      skipped++;
      continue;
    }
    seenNames.add(name.toLowerCase());

    const statusRaw = cell(row, mapping, "companyStatus").toLowerCase();
    const status = (COMPANY_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as CompanyStatus)
      : "prospect";

    const [company] = await db
      .insert(companies)
      .values({
        business,
        name,
        website: cell(row, mapping, "companyWebsite") || null,
        status,
        source: cell(row, mapping, "companySource") || null,
      })
      .returning({ id: companies.id });
    imported++;

    const contactName = cell(row, mapping, "contactName");
    if (contactName) {
      await db.insert(contacts).values({
        companyId: company.id,
        name: contactName,
        email: cell(row, mapping, "contactEmail") || null,
        phone: cell(row, mapping, "contactPhone") || null,
        title: cell(row, mapping, "contactTitle") || null,
      });
      contactsImported++;
    }
  }

  return { imported, skipped, contactsImported };
}
