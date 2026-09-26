export const IMPORT_FIELDS = [
  "companyName",
  "companyWebsite",
  "companyStatus",
  "companySource",
  "contactName",
  "contactEmail",
  "contactPhone",
  "contactTitle",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

/** Maps an import field to the index of the CSV column it reads from, or null if unmapped. */
export type ImportMapping = Record<ImportField, number | null>;
