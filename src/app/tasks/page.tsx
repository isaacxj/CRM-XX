import Link from "next/link";
import { redirect } from "next/navigation";

import { BusinessBadge } from "@/components/kit/status-badges";
import { EmptyState } from "@/components/kit/data-table";
import { saveTaskAction } from "@/app/form-actions";
import { TaskSheet } from "@/components/forms/task-sheet";
import { ToastOnMount } from "@/components/kit/toast";
import { PageHeader } from "@/components/kit/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { groupTasksByDue } from "@/lib/task-groups";
import { WhoFilter, parseWho, type Who } from "@/components/who-filter";
import { ownerLabel } from "@/lib/activity";
import { markReplyReceived } from "@/server/db/activities";
import { getCurrentUserEmail } from "@/server/user";
import { listCompanies } from "@/server/db/companies";
import { BUSINESSES, type Business } from "@/server/db/schema";
import {
  TASK_TABS,
  completeTask,
  countTasksByTab,
  deleteTask,
  listTasks,
  reopenTask,
  snoozeTask,
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

const SNOOZE_OPTIONS = [
  { days: 1, label: "Tomorrow" },
  { days: 3, label: "In 3 days" },
  { days: 7, label: "Next week" },
] as const;

const EMPTY_COPY: Record<TaskTab, string> = {
  overdue: "Nothing overdue. Nice.",
  today: "Nothing due today.",
  upcoming: "No upcoming follow-ups. Use Add task to create one.",
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

function tasksHref(tab: TaskTab, business?: Business, who: Who = "everyone") {
  const params = new URLSearchParams({ tab });
  if (business) params.set("business", business);
  if (who === "mine") params.set("who", "mine");
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
  const me = await getCurrentUserEmail();
  const who = me ? parseWho(params.who) : "everyone";
  const owner = who === "mine" ? me : null;
  const here = tasksHref(tab, business, who);

  const [tasks, counts, companies] = await Promise.all([
    listTasks(tab, business, owner),
    countTasksByTab(business, owner),
    listCompanies({}),
  ]);
  const savedFollowUp = params.saved === "followup";
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

  async function snooze(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    const days = Number(formData.get("days"));
    if (Number.isInteger(id) && [1, 3, 7].includes(days)) {
      await snoozeTask(id, days);
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

  const groups =
    tab === "done"
      ? [{ key: "done", label: "Completed", tasks }]
      : groupTasksByDue(tasks, today);

  const pill = (active: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${
      active
        ? "bg-surface-hover text-foreground font-medium"
        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
    }`;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      {savedFollowUp && <ToastOnMount message="Follow-up added." />}
      {params.new === "1" && (
        <TaskSheet
          action={saveTaskAction.bind(null, null)}
          closeHref={here}
          companies={companies.map((c) => ({
            id: c.id,
            name: c.name,
            business: c.business,
          }))}
        />
      )}
      <PageHeader
        title="Tasks"
        description="Every follow-up across your companies, grouped by when it's due, plus tasks that don't belong to one."
        actions={
          <Link
            href={`${here}&new=1`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Add task
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Task tabs" className="flex flex-wrap gap-1">
          {TASK_TABS.map((t) => (
            <Link
              key={t}
              href={tasksHref(t, business, who)}
              aria-current={t === tab ? "page" : undefined}
              className={pill(t === tab)}
            >
              {TAB_LABEL[t]}
              <span className="num text-muted-foreground text-xs">
                {counts[t]}
              </span>
            </Link>
          ))}
        </nav>
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Business filter"
        >
          {[undefined, ...BUSINESSES].map((b) => (
            <Link
              key={b ?? "all"}
              href={tasksHref(tab, b, who)}
              aria-current={b === business ? "true" : undefined}
              className={pill(b === business)}
            >
              {b ? BUSINESS_LABEL[b] : "All"}
            </Link>
          ))}
          {me && (
            <>
              <span className="bg-border mx-1 w-px self-stretch" />
              <WhoFilter
                who={who}
                hrefFor={(w) => tasksHref(tab, business, w)}
              />
            </>
          )}
        </div>
      </div>

      {business && (
        <p className="text-muted-foreground -mt-3 text-xs">
          Tasks with no company are hidden while a business is selected.
        </p>
      )}

      {tasks.length === 0 ? (
        <EmptyState title={EMPTY_COPY[tab]} />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`group-${group.key}`}>
              <h2
                id={`group-${group.key}`}
                className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-medium"
              >
                {group.label}
                <span className="num text-xs">{group.tasks.length}</span>
              </h2>
              <Card className="divide-border divide-y p-0">
                {group.tasks.map((task) => {
                  const late = !!task.dueDate && task.dueDate < today;
                  const open = !task.doneAt;
                  return (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center gap-3 p-3"
                    >
                      {task.kind === "awaiting_reply" && open ? (
                        <form action={gotReply}>
                          <input type="hidden" name="id" value={task.id} />
                          <Button type="submit" variant="secondary" size="sm">
                            Got reply
                          </Button>
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
                            className={`flex size-6 items-center justify-center rounded-md border text-xs ${
                              task.doneAt
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border-strong hover:bg-surface-hover"
                            }`}
                          >
                            {task.doneAt ? "✓" : ""}
                          </button>
                        </form>
                      )}
                      <div className="min-w-0 flex-1 basis-48">
                        <p
                          className={`truncate text-sm font-medium ${
                            task.doneAt
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {task.companyId ? (
                            <Link
                              href={`/companies/${task.companyId}`}
                              className="hover:text-foreground underline"
                            >
                              {task.companyName}
                            </Link>
                          ) : (
                            "No company"
                          )}
                          {task.ownerEmail &&
                            ` · ${ownerLabel(task.ownerEmail)}`}
                        </p>
                      </div>
                      {task.business && (
                        <BusinessBadge business={task.business} />
                      )}
                      <Badge
                        tone={late && open ? "danger" : "neutral"}
                        className="num"
                      >
                        {task.dueDate ? formatDueDate(task.dueDate) : "No date"}
                      </Badge>
                      {open && (
                        <details className="relative">
                          <summary className="text-muted-foreground hover:bg-surface-hover hover:text-foreground inline-flex h-8 cursor-pointer list-none items-center rounded-md px-2.5 text-sm">
                            Snooze
                          </summary>
                          <form
                            action={snooze}
                            aria-label={`Snooze: ${task.title}`}
                            className="border-border bg-surface-raised absolute right-0 z-20 mt-1 flex w-36 flex-col gap-0.5 rounded-lg border p-1 shadow-lg"
                          >
                            <input type="hidden" name="id" value={task.id} />
                            {SNOOZE_OPTIONS.map((o) => (
                              <Button
                                key={o.days}
                                type="submit"
                                name="days"
                                value={o.days}
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                              >
                                {o.label}
                              </Button>
                            ))}
                          </form>
                        </details>
                      )}
                      <form action={remove}>
                        <input type="hidden" name="id" value={task.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${task.title}`}
                        >
                          Remove
                        </Button>
                      </form>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
