import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "./index";
import {
  ACTIVITY_TYPES,
  TASK_KINDS,
  activities,
  contacts,
  tasks,
} from "./schema";

type Contact = typeof contacts.$inferSelect;
type Task = typeof tasks.$inferSelect;
type Activity = typeof activities.$inferSelect;

// Removing a contact, follow-up or activity from a company page can be undone
// from the toast. The removed rows travel in the redirect URL, and restoring
// inserts them again (with new ids, as nothing else points at them).
export type RemovedSnapshot =
  | { kind: "contact"; row: Contact }
  | { kind: "task"; row: Task }
  | { kind: "activity"; row: Activity; tasks: Task[] };

const id = z.number().int().positive();
const text = z.string().nullable();
const stamps = { createdAt: z.string(), updatedAt: z.string() };

const contactRow = z.object({
  id,
  companyId: id,
  name: z.string().min(1),
  email: text,
  phone: text,
  title: text,
  ...stamps,
});
const taskRow = z.object({
  id,
  companyId: id.nullable(),
  title: z.string().min(1),
  dueDate: text,
  doneAt: text,
  kind: z.enum(TASK_KINDS),
  ownerEmail: text,
  activityId: id.nullable(),
  ...stamps,
});
const activityRow = z.object({
  id,
  companyId: id,
  contactId: id.nullable(),
  type: z.enum(ACTIVITY_TYPES),
  subject: text,
  body: z.string(),
  occurredAt: z.string(),
  endsAt: text,
  ownerEmail: text,
  messageId: text,
  threadId: text,
  ...stamps,
});

export const snapshotSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("contact"), row: contactRow }),
  z.object({ kind: z.literal("task"), row: taskRow }),
  z.object({
    kind: z.literal("activity"),
    row: activityRow,
    tasks: z.array(taskRow),
  }),
]);

// Parses the snapshot from a redirect URL; null when it is missing or invalid.
export function parseSnapshot(raw: string | undefined): RemovedSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = snapshotSchema.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as RemovedSnapshot) : null;
  } catch {
    return null;
  }
}

export async function snapshotContact(
  id: number,
): Promise<RemovedSnapshot | null> {
  const db = getDb();
  const [row] = await db.select().from(contacts).where(eq(contacts.id, id));
  return row ? { kind: "contact", row } : null;
}

export async function snapshotTask(
  id: number,
): Promise<RemovedSnapshot | null> {
  const db = getDb();
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  return row ? { kind: "task", row } : null;
}

export async function snapshotActivity(
  id: number,
): Promise<RemovedSnapshot | null> {
  const db = getDb();
  const [row] = await db.select().from(activities).where(eq(activities.id, id));
  if (!row) return null;
  const linked = await db.select().from(tasks).where(eq(tasks.activityId, id));
  return { kind: "activity", row, tasks: linked };
}

export async function restoreRemoved(snapshot: RemovedSnapshot) {
  const db = getDb();
  const { id: _id, ...row } = snapshot.row;
  void _id;

  if (snapshot.kind === "contact") {
    await db.insert(contacts).values(row as Omit<Contact, "id">);
  } else if (snapshot.kind === "task") {
    await db.insert(tasks).values(row as Omit<Task, "id">);
  } else {
    const [activity] = await db
      .insert(activities)
      .values(row as Omit<Activity, "id">)
      .returning();
    for (const t of snapshot.tasks) {
      const { id: _tid, ...taskRow } = t;
      void _tid;
      await db.insert(tasks).values({ ...taskRow, activityId: activity.id });
    }
  }
}
