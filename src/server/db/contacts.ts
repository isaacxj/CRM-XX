import { asc, eq, sql } from "drizzle-orm";

import { getDb } from "./index";
import { companies, contacts } from "./schema";

export async function listContactsForCompany(companyId: number) {
  const db = getDb();
  return db
    .select()
    .from(contacts)
    .where(eq(contacts.companyId, companyId))
    .orderBy(asc(contacts.name));
}

export type ContactFilters = {
  q?: string;
};

export async function listContacts(filters: ContactFilters) {
  const db = getDb();

  const condition = filters.q
    ? sql`lower(${contacts.name}) like ${`%${filters.q.toLowerCase()}%`}`
    : undefined;

  return db
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
    .where(condition)
    .orderBy(asc(contacts.name));
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
