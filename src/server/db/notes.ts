import { desc, eq } from "drizzle-orm";

import { getDb } from "./index";
import { notes } from "./schema";

export async function listNotesForCompany(companyId: number) {
  const db = getDb();
  return db
    .select()
    .from(notes)
    .where(eq(notes.companyId, companyId))
    .orderBy(desc(notes.createdAt));
}

export async function createNote(companyId: number, body: string) {
  const db = getDb();
  const [note] = await db.insert(notes).values({ companyId, body }).returning();
  return note;
}

export async function deleteNote(id: number) {
  const db = getDb();
  await db.delete(notes).where(eq(notes.id, id));
}
