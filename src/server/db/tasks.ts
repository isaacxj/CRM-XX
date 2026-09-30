import {
  and,
  asc,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";

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

export async function createTask(companyId: number | null, input: TaskInput) {
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

export const TASK_TABS = ["overdue", "today", "upcoming", "done"] as const;
export type TaskTab = (typeof TASK_TABS)[number];

export type TaskRow = {
  id: number;
  title: string;
  dueDate: string | null;
  doneAt: string | null;
  companyId: number | null;
  companyName: string | null;
  business: Business | null;
};

function tabFilter(tab: TaskTab, today: string) {
  switch (tab) {
    case "overdue":
      return and(isNull(tasks.doneAt), lt(tasks.dueDate, today));
    case "today":
      return and(isNull(tasks.doneAt), eq(tasks.dueDate, today));
    case "upcoming":
      // Open tasks due later, plus open tasks with no due date.
      return and(
        isNull(tasks.doneAt),
        or(gt(tasks.dueDate, today), isNull(tasks.dueDate)),
      );
    case "done":
      return isNotNull(tasks.doneAt);
  }
}

// Filtering by business hides standalone tasks, since they belong to neither.
function taskWhere(tab: TaskTab, today: string, business?: Business) {
  return and(
    tabFilter(tab, today),
    business ? eq(companies.business, business) : undefined,
  );
}

export async function listTasks(
  tab: TaskTab,
  business?: Business,
): Promise<TaskRow[]> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      doneAt: tasks.doneAt,
      companyId: tasks.companyId,
      companyName: companies.name,
      business: companies.business,
    })
    .from(tasks)
    .leftJoin(companies, eq(tasks.companyId, companies.id))
    .where(taskWhere(tab, today, business))
    .orderBy(
      tab === "done" ? desc(tasks.doneAt) : asc(sql`${tasks.dueDate} is null`),
      asc(tasks.dueDate),
      asc(tasks.id),
    );
}

export async function countTasksByTab(
  business?: Business,
): Promise<Record<TaskTab, number>> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const entries = await Promise.all(
    TASK_TABS.map(async (tab) => {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .leftJoin(companies, eq(tasks.companyId, companies.id))
        .where(taskWhere(tab, today, business));
      return [tab, Number(row?.count ?? 0)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<TaskTab, number>;
}
