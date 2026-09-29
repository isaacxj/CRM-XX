import { desc, eq } from "drizzle-orm";

import { getDb } from "./index";
import { activities, contacts, type ActivityType } from "./schema";

export type NewActivity = {
  companyId: number;
  type: ActivityType;
  contactId?: number | null;
  subject?: string | null;
  body?: string;
  occurredAt?: string | null;
};

// Timestamps are "YYYY-MM-DD HH:MM:SS" UTC text, matching current_timestamp.
function nowUtc() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

// Accepts a datetime-local value ("2026-09-29T14:30") or a date, returns UTC text.
function normalizeOccurredAt(value: string | null | undefined) {
  if (!value) return nowUtc();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return nowUtc();
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

export async function listActivitiesForCompany(companyId: number) {
  const db = getDb();
  return db
    .select({
      id: activities.id,
      type: activities.type,
      subject: activities.subject,
      body: activities.body,
      occurredAt: activities.occurredAt,
      contactId: activities.contactId,
      contactName: contacts.name,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(eq(activities.companyId, companyId))
    .orderBy(desc(activities.occurredAt), desc(activities.id));
}

export async function createActivity(input: NewActivity) {
  const subject = input.subject?.trim() || null;
  const body = input.body?.trim() ?? "";
  if (input.type === "note" ? !body : !subject && !body) {
    throw new Error(
      input.type === "note"
        ? "Write what happened before saving the note."
        : "Add a subject or details before saving.",
    );
  }
  const db = getDb();
  const [row] = await db
    .insert(activities)
    .values({
      companyId: input.companyId,
      type: input.type,
      contactId: input.contactId ?? null,
      subject,
      body,
      occurredAt: normalizeOccurredAt(input.occurredAt),
    })
    .returning();
  return row;
}

export async function deleteActivity(id: number) {
  const db = getDb();
  await db.delete(activities).where(eq(activities.id, id));
}
