export type TaskGroupKey =
  "overdue" | "today" | "tomorrow" | "this_week" | "later" | "no_date";

export const TASK_GROUP_LABEL: Record<TaskGroupKey, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  this_week: "This week",
  later: "Later",
  no_date: "No date",
};

const ORDER: TaskGroupKey[] = [
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "later",
  "no_date",
];

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Which due-date bucket a task falls in. `today` is a UTC yyyy-mm-dd string,
// matching how due dates are compared everywhere else.
export function taskGroupFor(
  dueDate: string | null,
  today: string,
): TaskGroupKey {
  if (!dueDate) return "no_date";
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate === addDays(today, 1)) return "tomorrow";
  if (dueDate <= addDays(today, 7)) return "this_week";
  return "later";
}

// Splits tasks into non-empty due-date groups, in display order. Snoozing a
// task changes its due date, so it lands in the right group on the next load.
export function groupTasksByDue<T extends { dueDate: string | null }>(
  tasks: T[],
  today: string,
): { key: TaskGroupKey; label: string; tasks: T[] }[] {
  const buckets = new Map<TaskGroupKey, T[]>();
  for (const task of tasks) {
    const key = taskGroupFor(task.dueDate, today);
    buckets.set(key, [...(buckets.get(key) ?? []), task]);
  }
  return ORDER.filter((key) => buckets.has(key)).map((key) => ({
    key,
    label: TASK_GROUP_LABEL[key],
    tasks: buckets.get(key)!,
  }));
}
