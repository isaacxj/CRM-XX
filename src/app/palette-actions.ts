"use server";

import { listRecentCompanies } from "@/server/db/pins";
import { searchAll } from "@/server/db/search";
import { getCurrentUserEmail } from "@/server/user";

export type PaletteHit = {
  key: string;
  kind: "company" | "contact" | "deal";
  label: string;
  detail: string;
  href: string;
};

const PER_KIND = 5;

export async function searchPalette(q: string): Promise<PaletteHit[]> {
  const term = q.trim().slice(0, 100);
  if (!term) return [];

  const found = await searchAll({ q: term });

  return [
    ...found.companies.slice(0, PER_KIND).map((c) => ({
      key: `company-${c.id}`,
      kind: "company" as const,
      label: c.name,
      detail: c.business,
      href: `/companies/${c.id}`,
    })),
    ...found.contacts.slice(0, PER_KIND).map((c) => ({
      key: `contact-${c.id}`,
      kind: "contact" as const,
      label: c.name,
      detail: `${c.companyName}${c.email ? ` · ${c.email}` : ""}`,
      href: `/companies/${c.companyId}`,
    })),
    ...found.deals.slice(0, PER_KIND).map((d) => ({
      key: `deal-${d.id}`,
      kind: "deal" as const,
      label: d.title,
      detail: `${d.companyName} · ${d.stage}`,
      href: `/companies/${d.companyId}`,
    })),
  ];
}

// The last few companies this person opened, shown before they type.
export async function recentPalette(): Promise<PaletteHit[]> {
  const recent = await listRecentCompanies((await getCurrentUserEmail()) ?? "");
  return recent.map((c) => ({
    key: `recent-${c.id}`,
    kind: "company" as const,
    label: c.name,
    detail: c.business,
    href: `/companies/${c.id}`,
  }));
}
