import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { groupDuplicates } from "@/lib/duplicates";
import { getDb } from "./index";
import {
  activities,
  companies,
  companyPins,
  companyViews,
  contacts,
  deals,
  tasks,
  type Business,
} from "./schema";

export type DuplicateCompany = {
  id: number;
  business: Business;
  name: string;
  website: string | null;
  status: string;
  createdAt: string;
  contacts: number;
  deals: number;
  activities: number;
  tasks: number;
};

// Active companies that look like the same company entered more than once,
// grouped within a business. The richest record in each group comes first.
// Written out in full: drizzle drops the table prefix from column references
// in a single-table select, which would bind these subqueries to their own id.
const outerId = sql.raw('"companies"."id"');

export async function listDuplicateGroups(business?: Business) {
  const db = getDb();
  const rows = await db
    .select({
      id: companies.id,
      business: companies.business,
      name: companies.name,
      website: companies.website,
      status: companies.status,
      createdAt: companies.createdAt,
      contacts: sql<number>`(select count(*) from ${contacts} where ${contacts.companyId} = ${outerId})`,
      deals: sql<number>`(select count(*) from ${deals} where ${deals.companyId} = ${outerId})`,
      activities: sql<number>`(select count(*) from ${activities} where ${activities.companyId} = ${outerId})`,
      tasks: sql<number>`(select count(*) from ${tasks} where ${tasks.companyId} = ${outerId})`,
    })
    .from(companies)
    .where(
      and(
        isNull(companies.archivedAt),
        business ? eq(companies.business, business) : undefined,
      ),
    );

  const weight = (c: DuplicateCompany) =>
    c.contacts + c.deals + c.activities + c.tasks;
  return groupDuplicates(rows)
    .map((group) =>
      [...group].sort((a, b) => weight(b) - weight(a) || a.id - b.id),
    )
    .sort((a, b) => a[0].name.localeCompare(b[0].name));
}

export type MergeResult =
  | { ok: true; keepName: string; mergedName: string }
  | { ok: false; problem: string };

// Moves everything from `mergeId` onto `keepId`, fills blank website and
// source on the kept record, logs a note, and archives the other company.
// One atomic batch, since D1 has no interactive transactions.
export async function mergeCompanies(
  keepId: number,
  mergeId: number,
): Promise<MergeResult> {
  if (keepId === mergeId)
    return { ok: false, problem: "Pick two different companies to merge." };

  const db = getDb();
  const found = await db
    .select()
    .from(companies)
    .where(inArray(companies.id, [keepId, mergeId]));
  const keep = found.find((c) => c.id === keepId);
  const gone = found.find((c) => c.id === mergeId);
  if (!keep || !gone || keep.archivedAt || gone.archivedAt)
    return {
      ok: false,
      problem: "One of those companies was already archived. Reload the list.",
    };
  if (keep.business !== gone.business)
    return {
      ok: false,
      problem: "Companies in different businesses can't be merged.",
    };

  const now = sql`(current_timestamp)`;
  await db.batch([
    db
      .update(contacts)
      .set({ companyId: keepId, updatedAt: now })
      .where(eq(contacts.companyId, mergeId)),
    db
      .update(deals)
      .set({ companyId: keepId, updatedAt: now })
      .where(eq(deals.companyId, mergeId)),
    db
      .update(activities)
      .set({ companyId: keepId, updatedAt: now })
      .where(eq(activities.companyId, mergeId)),
    db
      .update(tasks)
      .set({ companyId: keepId, updatedAt: now })
      .where(eq(tasks.companyId, mergeId)),
    db.delete(companyPins).where(eq(companyPins.companyId, mergeId)),
    db.delete(companyViews).where(eq(companyViews.companyId, mergeId)),
    db
      .update(companies)
      .set({
        website: keep.website || gone.website,
        source: keep.source || gone.source,
        updatedAt: now,
      })
      .where(eq(companies.id, keepId)),
    db.insert(activities).values({
      companyId: keepId,
      type: "note",
      subject: "Merged duplicate company",
      body: `Merged ${gone.name} into this company. Its contacts, deals, activity and follow-ups moved here.`,
      occurredAt: new Date().toISOString(),
    }),
    db
      .update(companies)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(companies.id, mergeId)),
  ]);
  return { ok: true, keepName: keep.name, mergedName: gone.name };
}
