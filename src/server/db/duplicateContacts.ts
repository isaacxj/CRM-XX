import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "./index";
import { activities, companies, contacts, type Business } from "./schema";

export type DuplicateContact = {
  id: number;
  companyId: number;
  companyName: string;
  business: Business;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  activities: number;
};

const outerId = sql.raw('"contacts"."id"');

// Groups contacts at the same company that share an email or a name
// (case-insensitive). Groups of one are dropped.
export function groupDuplicateContacts<
  T extends {
    id: number;
    companyId: number;
    name: string;
    email: string | null;
  },
>(rows: T[]) {
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    const p = parent.get(id) ?? id;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const seen = new Map<string, number>();
  for (const row of rows) {
    const keys = [`n:${row.name.trim().toLowerCase().replace(/\s+/g, " ")}`];
    const email = row.email?.trim().toLowerCase();
    if (email) keys.push(`e:${email}`);
    for (const key of keys) {
      if (key === "n:") continue;
      const scoped = `${row.companyId}|${key}`;
      const first = seen.get(scoped);
      if (first === undefined) seen.set(scoped, row.id);
      else parent.set(find(row.id), find(first));
    }
  }
  const groups = new Map<number, T[]>();
  for (const row of rows) {
    const root = find(row.id);
    groups.set(root, [...(groups.get(root) ?? []), row]);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

// The fullest record in each group comes first.
export async function listDuplicateContactGroups(business?: Business) {
  const db = getDb();
  const rows: DuplicateContact[] = await db
    .select({
      id: contacts.id,
      companyId: contacts.companyId,
      companyName: companies.name,
      business: companies.business,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      activities: sql<number>`(select count(*) from ${activities} where ${activities.contactId} = ${outerId})`,
    })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .where(
      and(
        isNull(companies.archivedAt),
        business ? eq(companies.business, business) : undefined,
      ),
    );

  const weight = (c: DuplicateContact) =>
    c.activities +
    [c.email, c.phone, c.title].filter((v) => v && v.trim()).length;
  return groupDuplicateContacts(rows)
    .map((g) => [...g].sort((a, b) => weight(b) - weight(a) || a.id - b.id))
    .sort((a, b) => a[0].name.localeCompare(b[0].name));
}

export type MergeContactsResult =
  { ok: true; keepName: string } | { ok: false; problem: string };

// Moves the other contact's logged activity onto the kept one, fills its blank
// email, phone and title, and deletes the other. One atomic batch.
export async function mergeContacts(
  keepId: number,
  mergeId: number,
): Promise<MergeContactsResult> {
  if (keepId === mergeId)
    return { ok: false, problem: "Pick two different contacts to merge." };
  const db = getDb();
  const found = await db
    .select()
    .from(contacts)
    .where(inArray(contacts.id, [keepId, mergeId]));
  const keep = found.find((c) => c.id === keepId);
  const gone = found.find((c) => c.id === mergeId);
  if (!keep || !gone)
    return {
      ok: false,
      problem: "One of those contacts was already merged. Reload the list.",
    };
  if (keep.companyId !== gone.companyId)
    return {
      ok: false,
      problem: "Contacts at different companies can't be merged.",
    };

  const now = sql`(current_timestamp)`;
  await db.batch([
    db
      .update(activities)
      .set({ contactId: keepId, updatedAt: now })
      .where(eq(activities.contactId, mergeId)),
    db
      .update(contacts)
      .set({
        email: keep.email || gone.email,
        phone: keep.phone || gone.phone,
        title: keep.title || gone.title,
        updatedAt: now,
      })
      .where(eq(contacts.id, keepId)),
    db.insert(activities).values({
      companyId: keep.companyId,
      contactId: keepId,
      type: "note",
      subject: "Merged duplicate contact",
      body: `Merged ${gone.name} into ${keep.name}. Their logged activity moved here.`,
      occurredAt: new Date().toISOString(),
    }),
    db.delete(contacts).where(eq(contacts.id, mergeId)),
  ]);
  return { ok: true, keepName: keep.name };
}
