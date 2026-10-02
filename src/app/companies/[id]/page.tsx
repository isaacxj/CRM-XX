import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { ConfirmSubmit } from "@/components/kit/confirm-dialog";

import { archiveCompany, getCompany } from "@/server/db/companies";
import { deleteContact, listContactsForCompany } from "@/server/db/contacts";
import {
  createDeal,
  deleteDeal,
  listDealsForCompany,
  moveDealStage,
} from "@/server/db/deals";
import {
  createActivity,
  deleteActivity,
  listActivitiesForCompany,
  markReplyReceived,
} from "@/server/db/activities";
import {
  ACTIVITY_TYPE_ICON,
  ACTIVITY_TYPE_LABEL,
  formatMeetingTime,
  ownerLabel,
} from "@/lib/activity";
import { listTimelineForCompany } from "@/server/db/timeline";
import {
  completeTask,
  createTask,
  deleteTask,
  listTasksForCompany,
  reopenTask,
} from "@/server/db/tasks";
import {
  ACTIVITY_TYPES,
  DEAL_BILLING,
  STATIXX_STAGES,
  TRAZO_STAGES,
  type ActivityType,
  type Business,
  type CompanyStatus,
  type DealBilling,
  type DealStage,
} from "@/server/db/schema";

function formatDueDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

function formatTimestamp(value: string) {
  // D1 stores current_timestamp as UTC without a zone marker.
  return new Date(`${value.replace(" ", "T")}Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const STATUS_LABEL: Record<CompanyStatus, string> = {
  prospect: "Prospect",
  client: "Client",
  past: "Past client",
};

const DEAL_STAGE_LABEL: Record<DealStage, string> = {
  qualified: "Qualified",
  discovery: "Discovery",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  demo: "Demo",
  pilot: "Pilot",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const DEAL_BILLING_LABEL: Record<DealBilling, string> = {
  one_time: "One-time",
  monthly: "Monthly",
};

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = Number(id);
  const company = Number.isInteger(companyId)
    ? await getCompany(companyId)
    : null;

  if (!company) {
    notFound();
  }

  const contacts = await listContactsForCompany(companyId);
  const deals = await listDealsForCompany(companyId);
  const activities = await listActivitiesForCompany(companyId);
  const tasks = await listTasksForCompany(companyId);
  const timeline = await listTimelineForCompany(companyId);
  const stages = company.business === "statixx" ? STATIXX_STAGES : TRAZO_STAGES;

  async function archive() {
    "use server";
    await archiveCompany(companyId);
    redirect("/companies");
  }

  async function removeContact(formData: FormData) {
    "use server";
    const contactId = Number(formData.get("contactId"));
    await deleteContact(contactId);
    redirect(`/companies/${companyId}`);
  }

  async function addDeal(formData: FormData) {
    "use server";
    const title = formData.get("title");
    const amount = formData.get("amount");
    const billing = formData.get("billing");
    const closeDate = formData.get("closeDate");
    const amountValue = typeof amount === "string" ? Number(amount) : NaN;

    if (
      typeof title !== "string" ||
      title.trim().length === 0 ||
      typeof billing !== "string" ||
      !(DEAL_BILLING as readonly string[]).includes(billing) ||
      !Number.isFinite(amountValue) ||
      amountValue < 0
    ) {
      throw new Error(
        "Deal needs a title, a valid amount, and a billing type.",
      );
    }

    await createDeal(companyId, {
      title: title.trim(),
      amountCents: Math.round(amountValue * 100),
      billing: billing as DealBilling,
      closeDate:
        typeof closeDate === "string" && closeDate.trim()
          ? closeDate.trim()
          : null,
    });
    redirect(`/companies/${companyId}`);
  }

  async function moveDeal(formData: FormData) {
    "use server";
    const dealId = Number(formData.get("dealId"));
    const stage = formData.get("stage");
    const lostReason = formData.get("lostReason");

    if (
      typeof stage !== "string" ||
      !(stages as readonly string[]).includes(stage)
    ) {
      throw new Error("Pick a valid stage.");
    }

    await moveDealStage(
      dealId,
      stage as DealStage,
      typeof lostReason === "string" ? lostReason : null,
    );
    redirect(`/companies/${companyId}`);
  }

  async function removeDeal(formData: FormData) {
    "use server";
    const dealId = Number(formData.get("dealId"));
    await deleteDeal(dealId);
    redirect(`/companies/${companyId}`);
  }

  async function addActivity(formData: FormData) {
    "use server";
    const type = formData.get("type");
    const contactId = Number(formData.get("contactId"));
    const str = (key: string) => {
      const v = formData.get(key);
      return typeof v === "string" ? v : "";
    };
    await createActivity({
      companyId,
      type: ACTIVITY_TYPES.includes(type as ActivityType)
        ? (type as ActivityType)
        : "note",
      contactId:
        Number.isInteger(contactId) && contactId > 0 ? contactId : null,
      subject: str("subject"),
      body: str("body"),
      occurredAt: str("occurredAt") || null,
      endsAt: str("endsAt") || null,
      remindInDays: Number(str("remindInDays")) || null,
    });
    redirect(`/companies/${companyId}`);
  }

  async function gotReply(formData: FormData) {
    "use server";
    await markReplyReceived(Number(formData.get("taskId")));
    redirect(`/companies/${companyId}`);
  }

  async function removeActivity(formData: FormData) {
    "use server";
    await deleteActivity(Number(formData.get("activityId")));
    redirect(`/companies/${companyId}`);
  }

  async function addTask(formData: FormData) {
    "use server";
    const title = formData.get("title");
    const dueDate = formData.get("dueDate");
    if (typeof title !== "string" || title.trim().length === 0) {
      throw new Error("Follow-up needs a title.");
    }
    await createTask(companyId, {
      title: title.trim(),
      dueDate:
        typeof dueDate === "string" && dueDate.trim() ? dueDate.trim() : null,
    });
    redirect(`/companies/${companyId}`);
  }

  async function toggleTask(formData: FormData) {
    "use server";
    const taskId = Number(formData.get("taskId"));
    const wasDone = formData.get("done") === "1";
    if (wasDone) {
      await reopenTask(taskId);
    } else {
      await completeTask(taskId);
    }
    redirect(`/companies/${companyId}`);
  }

  async function removeTask(formData: FormData) {
    "use server";
    const taskId = Number(formData.get("taskId"));
    await deleteTask(taskId);
    redirect(`/companies/${companyId}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{company.name}</h1>
          <p className="text-sm text-zinc-500">
            {BUSINESS_LABEL[company.business]} · {STATUS_LABEL[company.status]}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${company.id}/edit`}
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Edit
          </Link>
          <ConfirmSubmit
            action={archive}
            trigger="Archive"
            title={`Archive ${company.name}?`}
            description="It leaves the lists and Home. Its contacts, deals, and history are kept."
            confirmLabel="Archive company"
          />
        </div>
      </div>

      <dl className="grid max-w-md grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-zinc-500">Website</dt>
          <dd>{company.website ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Source</dt>
          <dd>{company.source ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Added</dt>
          <dd>{new Date(company.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Link
            href={`/companies/${company.id}/contacts/new`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Add contact
          </Link>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No contacts yet. Add the people you work with at this company.
          </p>
        ) : (
          <div className="max-w-2xl overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Title</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Phone</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 font-medium">{contact.name}</td>
                    <td className="py-2 text-zinc-500">
                      {contact.title ?? "—"}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {contact.email ?? "—"}
                    </td>
                    <td className="py-2 text-zinc-500">
                      {contact.phone ?? "—"}
                    </td>
                    <td className="py-2">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/companies/${company.id}/contacts/${contact.id}/edit`}
                          className="text-zinc-600 hover:underline dark:text-zinc-400"
                        >
                          Edit
                        </Link>
                        <form action={removeContact}>
                          <input
                            type="hidden"
                            name="contactId"
                            value={contact.id}
                          />
                          <button
                            type="submit"
                            className="text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deals</h2>
          <Link
            href="/deals"
            className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
          >
            View board →
          </Link>
        </div>

        <form
          action={addDeal}
          className="flex max-w-2xl flex-wrap items-end gap-3"
        >
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor="deal-title" className="text-sm font-medium">
              Deal
            </label>
            <input
              id="deal-title"
              name="title"
              type="text"
              required
              placeholder="Website redesign"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="amount" className="text-sm font-medium">
              Amount
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="5000"
              className="w-28 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="billing" className="text-sm font-medium">
              Billing
            </label>
            <select
              id="billing"
              name="billing"
              defaultValue={
                company.business === "trazo" ? "monthly" : "one_time"
              }
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {DEAL_BILLING.map((value) => (
                <option key={value} value={value}>
                  {DEAL_BILLING_LABEL[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="closeDate" className="text-sm font-medium">
              Expected close
            </label>
            <input
              id="closeDate"
              name="closeDate"
              type="date"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add deal
          </button>
        </form>

        {deals.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No deals yet. Add one to start tracking the pipeline.
          </p>
        ) : (
          <ul className="flex max-w-2xl flex-col gap-3">
            {deals.map((deal) => (
              <li
                key={deal.id}
                className="rounded border border-zinc-100 p-3 text-sm dark:border-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{deal.title}</p>
                    <p className="text-zinc-500">
                      {formatCents(deal.amountCents)} ·{" "}
                      {DEAL_BILLING_LABEL[deal.billing]}
                      {deal.closeDate &&
                        ` · closes ${formatDueDate(deal.closeDate)}`}
                    </p>
                  </div>
                  <form action={removeDeal}>
                    <input type="hidden" name="dealId" value={deal.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
                <form
                  action={moveDeal}
                  className="mt-3 flex flex-wrap items-end gap-2"
                >
                  <input type="hidden" name="dealId" value={deal.id} />
                  <select
                    name="stage"
                    defaultValue={deal.stage}
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {stages.map((stage) => (
                      <option key={stage} value={stage}>
                        {DEAL_STAGE_LABEL[stage]}
                      </option>
                    ))}
                  </select>
                  <input
                    name="lostReason"
                    type="text"
                    defaultValue={deal.lostReason ?? ""}
                    placeholder="Reason if Lost"
                    className="min-w-40 flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
                  >
                    Update
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Follow-ups</h2>
        <form
          action={addTask}
          className="flex max-w-2xl flex-wrap items-end gap-3"
        >
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor="title" className="text-sm font-medium">
              What&apos;s next
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Send proposal"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dueDate" className="text-sm font-medium">
              Due
            </label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add follow-up
          </button>
        </form>

        {tasks.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No follow-ups yet. Add one so nothing slips.
          </p>
        ) : (
          <ul className="flex max-w-2xl flex-col gap-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-4 border-b border-zinc-100 py-2 text-sm dark:border-zinc-900"
              >
                <div
                  className={task.doneAt ? "text-zinc-400 line-through" : ""}
                >
                  <span className="font-medium">{task.title}</span>
                  {task.dueDate && (
                    <span className="ml-2 text-zinc-500">
                      {formatDueDate(task.dueDate)}
                    </span>
                  )}
                  {task.ownerEmail && (
                    <span className="ml-2 text-zinc-500">
                      {ownerLabel(task.ownerEmail)}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  {task.kind === "awaiting_reply" && !task.doneAt && (
                    <form action={gotReply}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                      >
                        Got reply
                      </button>
                    </form>
                  )}
                  <form action={toggleTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <input
                      type="hidden"
                      name="done"
                      value={task.doneAt ? "1" : "0"}
                    />
                    <button
                      type="submit"
                      className="text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      {task.doneAt ? "Reopen" : "Mark done"}
                    </button>
                  </form>
                  <form action={removeTask}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button
                      type="submit"
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Log</h2>
        <form action={addActivity} className="flex max-w-2xl flex-col gap-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              name="type"
              aria-label="Type"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ACTIVITY_TYPE_ICON[t]} {ACTIVITY_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
            <select
              name="contactId"
              aria-label="Contact"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              name="occurredAt"
              aria-label="When (defaults to now)"
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="endsAt">If this is a meeting, it ends at</label>
            <input
              id="endsAt"
              type="datetime-local"
              name="endsAt"
              className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span className="text-zinc-500">(optional)</span>
          </div>
          <input
            name="subject"
            placeholder="Subject (optional)"
            aria-label="Subject"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="remindInDays">
              If this is a sent email, remind me in
            </label>
            <input
              id="remindInDays"
              name="remindInDays"
              type="number"
              min="0"
              max="60"
              defaultValue={3}
              className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <span>days if no reply (0 for no reminder)</span>
          </div>
          <textarea
            name="body"
            rows={3}
            placeholder="Log what happened…"
            aria-label="Details"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Log activity
          </button>
        </form>

        {activities.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nothing logged yet. Log an email, a call, a meeting, or a note
            above.
          </p>
        ) : (
          <ul className="flex max-w-2xl flex-col gap-3">
            {activities.map((a) => (
              <li
                key={a.id}
                className="rounded border border-zinc-100 p-3 text-sm dark:border-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium">
                      <span aria-hidden>{ACTIVITY_TYPE_ICON[a.type]}</span>{" "}
                      {ACTIVITY_TYPE_LABEL[a.type]}
                      {a.subject ? `: ${a.subject}` : ""}
                    </p>
                    {a.body && (
                      <p className="mt-1 whitespace-pre-wrap">{a.body}</p>
                    )}
                  </div>
                  <form action={removeActivity}>
                    <input type="hidden" name="activityId" value={a.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {a.contactName ? `${a.contactName} · ` : ""}
                  {a.type === "meeting"
                    ? formatMeetingTime(a.occurredAt, a.endsAt)
                    : new Date(
                        `${a.occurredAt.replace(" ", "T")}Z`,
                      ).toLocaleString()}
                  {a.ownerEmail && ` · ${ownerLabel(a.ownerEmail)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Activity</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nothing yet. Logged activity, finished follow-ups, and deal changes
            show up here.
          </p>
        ) : (
          <ol className="flex max-w-2xl flex-col">
            {timeline.map((item, index) => (
              <li
                key={index}
                className="flex gap-4 border-b border-zinc-100 py-2 text-sm dark:border-zinc-900"
              >
                <time className="w-24 shrink-0 text-zinc-500">
                  {formatTimestamp(item.at)}
                </time>
                <p className="min-w-0 whitespace-pre-wrap">
                  {item.kind === "activity" && (
                    <>
                      <span className="font-medium">
                        {ACTIVITY_TYPE_ICON[item.type]}{" "}
                        {ACTIVITY_TYPE_LABEL[item.type]}
                        {item.subject ? `: ${item.subject}` : ""}
                      </span>
                      {item.body ? ` ${item.body}` : ""}
                    </>
                  )}
                  {item.kind === "task_done" && (
                    <>
                      <span className="font-medium">Completed follow-up:</span>{" "}
                      {item.title}
                    </>
                  )}
                  {item.kind === "deal_created" && (
                    <>
                      <span className="font-medium">New deal:</span>{" "}
                      {item.title}
                    </>
                  )}
                  {item.kind === "stage_change" && (
                    <>
                      <span className="font-medium">{item.dealTitle}:</span>{" "}
                      {item.fromStage
                        ? `${DEAL_STAGE_LABEL[item.fromStage]} → `
                        : "moved to "}
                      {DEAL_STAGE_LABEL[item.toStage]}
                    </>
                  )}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Link href="/companies" className="text-sm text-zinc-500 hover:underline">
        ← Back to companies
      </Link>
    </div>
  );
}
