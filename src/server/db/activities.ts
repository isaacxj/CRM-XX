import { and, asc, desc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";

import { getCurrentUserEmail } from "@/server/user";

import { getDb } from "./index";
import {
  activities,
  companies,
  contacts,
  tasks,
  type ActivityType,
  type Business,
} from "./schema";

export type NewActivity = {
  companyId: number;
  type: ActivityType;
  contactId?: number | null;
  subject?: string | null;
  body?: string;
  occurredAt?: string | null;
  // Meetings only; must be after occurredAt.
  endsAt?: string | null;
  // For email_sent: create an awaiting_reply task due this many days out.
  remindInDays?: number | null;
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
      endsAt: activities.endsAt,
      ownerEmail: activities.ownerEmail,
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
  const occurredAt = normalizeOccurredAt(input.occurredAt);
  let endsAt: string | null = null;
  if (input.type === "meeting" && input.endsAt) {
    endsAt = normalizeOccurredAt(input.endsAt);
    if (endsAt <= occurredAt) {
      throw new Error("The meeting has to end after it starts.");
    }
  }
  const ownerEmail = await getCurrentUserEmail();
  const values = {
    endsAt,
    ownerEmail,
    companyId: input.companyId,
    type: input.type,
    contactId: input.contactId ?? null,
    subject,
    body,
    occurredAt,
  };
  const days = input.remindInDays;
  if (input.type !== "email_sent" || !days || days < 1) {
    const [row] = await db.insert(activities).values(values).returning();
    return row;
  }

  // The activity and its reminder land together or not at all.
  const due = new Date(`${occurredAt.replace(" ", "T")}Z`);
  due.setUTCDate(due.getUTCDate() + Math.floor(days));
  const [inserted] = await db.batch([
    db.insert(activities).values(values).returning(),
    db.insert(tasks).values({
      companyId: input.companyId,
      title: `Waiting on reply${subject ? `: ${subject}` : ""}`,
      dueDate: due.toISOString().slice(0, 10),
      kind: "awaiting_reply",
      ownerEmail,
      activityId: sql`last_insert_rowid()`,
    }),
  ]);
  return inserted[0];
}

// Logs the reply as an email received and closes the reminder, atomically.
export async function markReplyReceived(taskId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      companyId: activities.companyId,
      contactId: activities.contactId,
      subject: activities.subject,
      doneAt: tasks.doneAt,
      activityId: tasks.activityId,
    })
    .from(tasks)
    .innerJoin(activities, eq(tasks.activityId, activities.id))
    .where(eq(tasks.id, taskId));
  if (!row || row.doneAt) return;
  const ownerEmail = await getCurrentUserEmail();

  await db.batch([
    db.insert(activities).values({
      companyId: row.companyId,
      contactId: row.contactId,
      type: "email_received",
      subject: row.subject
        ? row.subject.replace(/^(re:\s*)?/i, "Re: ")
        : "Reply",
      body: "",
      occurredAt: nowUtc(),
      ownerEmail,
    }),
    db
      .update(tasks)
      .set({
        doneAt: sql`(current_timestamp)`,
        updatedAt: sql`(current_timestamp)`,
      })
      .where(eq(tasks.id, taskId)),
  ]);
}

export async function deleteActivity(id: number) {
  const db = getDb();
  // A reminder makes no sense without the email it waits on.
  await db.batch([
    db.delete(tasks).where(eq(tasks.activityId, id)),
    db.delete(activities).where(eq(activities.id, id)),
  ]);
}

export type UpcomingMeeting = {
  id: number;
  subject: string | null;
  occurredAt: string;
  endsAt: string | null;
  ownerEmail: string | null;
  companyId: number;
  companyName: string;
  business: Business;
  contactName: string | null;
};

// Meetings starting between now and the end of the day `days` from now.
export async function listUpcomingMeetings(
  days = 7,
  owner?: string | null,
): Promise<UpcomingMeeting[]> {
  const db = getDb();
  const now = new Date();
  const from = now.toISOString().slice(0, 19).replace("T", " ");
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() + days);
  const to = end.toISOString().slice(0, 19).replace("T", " ");
  return db
    .select({
      id: activities.id,
      subject: activities.subject,
      occurredAt: activities.occurredAt,
      endsAt: activities.endsAt,
      ownerEmail: activities.ownerEmail,
      companyId: activities.companyId,
      companyName: companies.name,
      business: companies.business,
      contactName: contacts.name,
    })
    .from(activities)
    .innerJoin(companies, eq(activities.companyId, companies.id))
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(
      and(
        eq(activities.type, "meeting"),
        // Still happening counts as upcoming.
        or(gte(activities.occurredAt, from), gte(activities.endsAt, from)),
        lt(activities.occurredAt, to),
        isNull(companies.archivedAt),
        owner ? eq(activities.ownerEmail, owner) : undefined,
      ),
    )
    .orderBy(asc(activities.occurredAt), asc(activities.id));
}
