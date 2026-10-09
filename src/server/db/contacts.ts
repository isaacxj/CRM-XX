import { and, asc, desc, eq, or, sql } from "drizzle-orm";

import { likePattern, matches } from "./search";
import { getDb } from "./index";
import { companies, contacts, type Business } from "./schema";

export async function listContactsForCompany(companyId: number) {
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.companyId, companyId))
    .orderBy(asc(contacts.name));
}

export type ContactSort = "name" | "company" | "title";

export type ContactFilters = {
  q?: string;
  business?: Business;
  sort?: ContactSort;
  dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

// Search covers name, email, title and company name, so a pasted email or a
// company name finds the person.
function contactCondition(filters: ContactFilters) {
  const term = filters.q?.trim();
  const pattern = term ? likePattern(term) : null;
  return and(
    filters.business ? eq(companies.business, filters.business) : undefined,
    pattern
      ? or(
          matches(contacts.name, pattern),
          matches(contacts.email, pattern),
          matches(contacts.title, pattern),
          matches(companies.name, pattern),
        )
      : undefined,
  );
}

function contactOrder(filters: ContactFilters) {
  const column =
    filters.sort === "company"
      ? companies.name
      : filters.sort === "title"
        ? contacts.title
        : contacts.name;
  const order = filters.dir === "desc" ? desc : asc;
  return [order(sql`lower(coalesce(${column}, ''))`), asc(contacts.id)];
}

export async function countContacts(filters: ContactFilters) {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .where(contactCondition(filters));
  return Number(row?.count ?? 0);
}

export async function listContacts(filters: ContactFilters) {
  const db = getDb();

  const query = db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      companyId: contacts.companyId,
      companyName: companies.name,
      business: companies.business,
    })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .where(contactCondition(filters))
    .orderBy(...contactOrder(filters));

  return filters.limit !== undefined
    ? query.limit(filters.limit).offset(filters.offset ?? 0)
    : query;
}

export async function getContact(id: number) {
  const db = getDb();
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
  return contact ?? null;
}

export type ContactInput = {
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
};

export async function createContact(companyId: number, input: ContactInput) {
  const db = getDb();
  const [contact] = await db
    .insert(contacts)
    .values({ companyId, ...input })
    .returning();
  return contact;
}

export async function updateContact(id: number, input: ContactInput) {
  const db = getDb();
  await db
    .update(contacts)
    .set({ ...input, updatedAt: sql`(current_timestamp)` })
    .where(eq(contacts.id, id));
}

export async function deleteContact(id: number) {
  const db = getDb();
  await db.delete(contacts).where(eq(contacts.id, id));
}

// A contact with its company, for the contact page. Null when the contact or
// its company no longer exists.
export async function getContactWithCompany(id: number) {
  const db = getDb();
  const [row] = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phone: contacts.phone,
      title: contacts.title,
      companyId: contacts.companyId,
      companyName: companies.name,
      business: companies.business,
      archivedAt: companies.archivedAt,
    })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .where(eq(contacts.id, id));
  return row ?? null;
}

export async function listColleagues(companyId: number, exceptId: number) {
  const db = getDb();
  return db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title })
    .from(contacts)
    .where(
      and(
        eq(contacts.companyId, companyId),
        sql`${contacts.id} != ${exceptId}`,
      ),
    )
    .orderBy(asc(contacts.name));
}
