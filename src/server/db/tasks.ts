import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";

import { getDb } from "./index";
import { companies, tasks, type Business } from "./schema";

export async function listTasksForCompany(companyId: number) {
  const db = getDb();
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.companyId, companyId))
    .orderBy(asc(tasks.dueDate));
}

export type TaskInput = {
  title: string;
  dueDate: string | null;
};

export async function createTask(companyId: number, input: TaskInput) {
  const db = getDb();
  const [task] = await db
    .insert(tasks)
    .values({ companyId, ...input })
    .returning();
  return task;
}

export async function completeTask(id: number) {
  const db = getDb();
  await db
    .update(tasks)
    .set({
      doneAt: sql`(current_timestamp)`,
      updatedAt: sql`(current_timestamp)`,
    })
    .where(eq(tasks.id, id));
}

export async function reopenTask(id: number) {
  const db = getDb();
  await db
    .update(tasks)
    .set({ doneAt: null, updatedAt: sql`(current_timestamp)` })
    .where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = getDb();
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function listDueFollowUps(business: Business) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      companyId: tasks.companyId,
      companyName: companies.name,
    })
    .from(tasks)
    .innerJoin(companies, eq(tasks.companyId, companies.id))
    .where(
      and(
        eq(companies.business, business),
        isNull(tasks.doneAt),
        lte(tasks.dueDate, today),
      ),
    )
    .orderBy(asc(tasks.dueDate));
}
