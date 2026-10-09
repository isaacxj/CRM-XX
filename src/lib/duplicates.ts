// Pure helpers for spotting the same company entered twice.

const SUFFIXES = new Set([
  "inc",
  "llc",
  "ltd",
  "corp",
  "corporation",
  "co",
  "company",
  "gmbh",
  "plc",
]);

// "Acme, Inc." and "ACME inc" both become "acme".
export function normalizeName(name: string) {
  const words = name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join("");
}

// "https://www.acme.com/about" becomes "acme.com".
export function websiteHost(website: string | null) {
  if (!website) return null;
  const raw = website.trim().toLowerCase();
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

export type DuplicateCandidate = {
  id: number;
  business: string;
  name: string;
  website: string | null;
};

// Groups companies of the same business that share a normalized name or a
// website host. Groups of one are dropped.
export function groupDuplicates<T extends DuplicateCandidate>(rows: T[]) {
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    const p = parent.get(id) ?? id;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: number, b: number) => parent.set(find(a), find(b));

  const seen = new Map<string, number>();
  for (const row of rows) {
    const keys = [`n:${normalizeName(row.name)}`];
    const host = websiteHost(row.website);
    if (host) keys.push(`w:${host}`);
    for (const key of keys) {
      if (key === "n:") continue;
      const scoped = `${row.business}|${key}`;
      const first = seen.get(scoped);
      if (first === undefined) seen.set(scoped, row.id);
      else union(row.id, first);
    }
  }

  const groups = new Map<number, T[]>();
  for (const row of rows) {
    const root = find(row.id);
    groups.set(root, [...(groups.get(root) ?? []), row]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
