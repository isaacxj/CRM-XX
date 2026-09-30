import Link from "next/link";
import { redirect } from "next/navigation";

import { markReplyReceived } from "@/server/db/activities";
import { listCompanies } from "@/server/db/companies";
import { BUSINESSES, type Business } from "@/server/db/schema";
import {
  TASK_TABS,
  completeTask,
  countTasksByTab,
  createTask,
  deleteTask,
  listTasks,
  reopenTask,
  type TaskTab,
} from "@/server/db/tasks";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const TAB_LABEL: Record<TaskTab, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  waiting: "Waiting on reply",
  done: "Done",
};

const EMPTY_COPY: Record<TaskTab, string> = {
  overdue: "Nothing overdue. Nice.",
  today: "Nothing due today.",
  upcoming: "No upcoming follow-ups. Add one below.",
  waiting:
    "No emails waiting on a reply. Log a sent email on a company and set a reminder.",
  done: "No completed follow-ups yet.",
};

function isTab(value: string): value is TaskTab {
  return (TASK_TABS as readonly string[]).includes(value);
}

function isBusiness(value: string): value is Business {
  return (BUSINESSES as readonly string[]).includes(value);
}

function formatDueDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

function tasksHref(tab: TaskTab, business?: Business) {
  const params = new URLSearchParams({ tab });
  if (business) params.set("business", business);
  return `/tasks?${params.toString()}`;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tabParam = typeof params.tab === "string" ? params.tab : "";
  const businessParam =
    typeof params.business === "string" ? params.business : "";
  const tab: TaskTab = isTab(tabParam) ? tabParam : "overdue";
  const business = isBusiness(businessParam) ? businessParam : undefined;
  const here = tasksHref(tab, business);

  const [tasks, counts, companies] = await Promise.all([
    listTasks(tab, business),
    countTasksByTab(business),
    listCompanies({}),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  async function toggle(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) return;
    if (formData.get("done") === "1") {
      await reopenTask(id);
    } else {
      await completeTask(id);
    }
    redirect(here);
  }

  async function gotReply(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) return;
    await markReplyReceived(id);
    redirect(here);
  }

  async function remove(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!Number.isInteger(id)) return;
    await deleteTask(id);
    redirect(here);
  }

  async function add(formData: FormData) {
    "use server";
    const title = formData.get("title");
    const dueDate = formData.get("dueDate");
    const companyRaw = formData.get("companyId");
    if (typeof title !== "string" || title.trim().length === 0) {
      throw new Error("Describe the follow-up before adding it.");
    }
    const companyId =
      typeof companyRaw === "string" && companyRaw !== ""
        ? Number(companyRaw)
        : null;
    if (companyId !== null && !Number.isInteger(companyId)) {
      throw new Error("Pick a company from the list, or leave it blank.");
    }
    const due =
      typeof dueDate === "string" && dueDate.trim() ? dueDate.trim() : null;
    await createTask(companyId, { title: title.trim(), dueDate: due });
    // Land on the tab where the new task will show up.
    const landing: TaskTab =
      due && due < today ? "overdue" : due === today ? "today" : "upcoming";
    redirect(tasksHref(landing, business));
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Every follow-up across your companies, plus tasks that don&apos;t
          belong to one.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Task tabs" className="flex gap-1">
          {TASK_TABS.map((t) => (
            <Link
              key={t}
              href={tasksHref(t, business)}
              aria-current={t === tab ? "page" : undefined}
              className={`rounded px-3 py-2 text-sm ${
                t === tab
                  ? "bg-zinc-100 font-medium dark:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {TAB_LABEL[t]} <span className="text-zinc-500">{counts[t]}</span>
            </Link>
          ))}
        </nav>
        <div className="flex gap-1" role="group" aria-label="Business filter">
          {[undefined, ...BUSINESSES].map((b) => (
            <Link
              key={b ?? "all"}
              href={tasksHref(tab, b)}
              aria-current={b === business ? "true" : undefined}
              className={`rounded px-3 py-2 text-sm ${
                b === business
                  ? "bg-zinc-100 font-medium dark:bg-zinc-800"
                  : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {b ? BUSINESS_LABEL[b] : "All"}
            </Link>
          ))}
        </div>
      </div>

      {business && (
        <p className="-mt-3 text-xs text-zinc-500">
          Tasks with no company are hidden while a business is selected.
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-500">{EMPTY_COPY[tab]}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 p-3">
              {task.kind === "awaiting_reply" && !task.doneAt ? (
                <form action={gotReply}>
                  <input type="hidden" name="id" value={task.id} />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium dark:border-zinc-700"
                  >
                    Got reply
                  </button>
                </form>
              ) : (
                <form action={toggle}>
                  <input type="hidden" name="id" value={task.id} />
                  <input
                    type="hidden"
                    name="done"
                    value={task.doneAt ? "1" : "0"}
                  />
                  <button
                    type="submit"
                    aria-label={
                      task.doneAt
                        ? `Reopen ${task.title}`
                        : `Mark ${task.title} done`
                    }
                    className={`flex size-6 items-center justify-center rounded border text-xs focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      task.doneAt
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-400 dark:border-zinc-600"
                    }`}
                  >
                    {task.doneAt ? "✓" : ""}
                  </button>
                </form>
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${
                    task.doneAt ? "text-zinc-500 line-through" : ""
                  }`}
                >
                  {task.title}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {task.companyId ? (
                    <Link
                      href={`/companies/${task.companyId}`}
                      className="underline"
                    >
                      {task.companyName}
                    </Link>
                  ) : (
                    "No company"
                  )}
                  {task.business && ` · ${BUSINESS_LABEL[task.business]}`}
                </p>
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  tab === "overdue" ||
                  (tab === "waiting" && task.dueDate && task.dueDate < today)
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-zinc-500"
                }`}
              >
                {task.dueDate ? formatDueDate(task.dueDate) : "No date"}
              </span>
              <form action={remove}>
                <input type="hidden" name="id" value={task.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${task.title}`}
                  className="rounded px-2 py-1 text-xs text-zinc-500 hover:underline"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={add}
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <h2 className="text-lg font-semibold">Add a task</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 sm:col-span-3">
            <label htmlFor="task-title" className="text-sm font-medium">
              What needs doing
            </label>
            <input
              id="task-title"
              name="title"
              type="text"
              required
              placeholder="Renew domain, send invoice, follow up…"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="task-company" className="text-sm font-medium">
              Company (optional)
            </label>
            <select
              id="task-company"
              name="companyId"
              defaultValue=""
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">No company</option>
              {BUSINESSES.map((b) => {
                const inBusiness = companies.filter((c) => c.business === b);
                if (inBusiness.length === 0) return null;
                return (
                  <optgroup key={b} label={BUSINESS_LABEL[b]}>
                    {inBusiness.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="task-due" className="text-sm font-medium">
              Due
            </label>
            <input
              id="task-due"
              name="dueDate"
              type="date"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
        <button
          type="submit"
          className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Add task
        </button>
      </form>
    </div>
  );
}
