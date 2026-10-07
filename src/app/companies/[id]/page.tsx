import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

import { CompanyColumns } from "@/components/company/columns";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Handshake,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  StickyNote,
  ArrowRightLeft,
} from "lucide-react";

import { Composer } from "@/components/company/composer";
import { InlineField } from "@/components/company/inline-field";
import { Avatar } from "@/components/kit/avatar";
import { saveContactAction, saveDealAction } from "@/app/form-actions";
import { ContactSheet } from "@/components/forms/contact-sheet";
import { DealSheet } from "@/components/forms/deal-sheet";
import { ToastOnMount, UndoToastOnMount } from "@/components/kit/toast";
import { ConfirmSubmit } from "@/components/kit/confirm-dialog";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge, StatusBadge } from "@/components/kit/status-badges";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

import {
  archiveCompany,
  getCompany,
  getCompanyLastActivity,
  updateCompanyFields,
} from "@/server/db/companies";
import { deleteContact, listContactsForCompany } from "@/server/db/contacts";
import {
  parseSnapshot,
  restoreRemoved,
  snapshotActivity,
  snapshotContact,
  snapshotTask,
  type RemovedSnapshot,
} from "@/server/db/restore";
import {
  deleteDeal,
  listDealsForCompany,
  moveDealStage,
} from "@/server/db/deals";
import {
  createActivity,
  deleteActivity,
  markReplyReceived,
} from "@/server/db/activities";
import {
  ACTIVITY_TYPE_LABEL,
  formatDaysAgo,
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
  COMPANY_STATUSES,
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

const ACTIVITY_ICON = {
  note: StickyNote,
  email_sent: Mail,
  email_received: MessageSquare,
  call: Phone,
  meeting: Calendar,
} as const;

const DEAL_BILLING_LABEL: Record<DealBilling, string> = {
  one_time: "One-time",
  monthly: "Monthly",
};

const SAVED_MESSAGE: Record<string, string> = {
  company: "Company added.",
  contact: "Contact saved.",
  deal: "Deal saved.",
  activity: "Activity logged.",
  followup: "Follow-up added.",
};

const REMOVED_LABEL = {
  contact: "Contact removed.",
  task: "Follow-up removed.",
  activity: "Activity removed.",
} as const;

function removedHref(companyId: number, snapshot: RemovedSnapshot | null) {
  const base = `/companies/${companyId}`;
  return snapshot
    ? `${base}?removed=${encodeURIComponent(JSON.stringify(snapshot))}`
    : base;
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const companyId = Number(id);
  const company = Number.isInteger(companyId)
    ? await getCompany(companyId)
    : null;

  if (!company) {
    notFound();
  }

  const contacts = await listContactsForCompany(companyId);
  const deals = await listDealsForCompany(companyId);
  const tasks = await listTasksForCompany(companyId);
  const timeline = await listTimelineForCompany(companyId);
  const lastActivityAt = await getCompanyLastActivity(companyId);
  const stages = company.business === "statixx" ? STATIXX_STAGES : TRAZO_STAGES;

  async function archive() {
    "use server";
    await archiveCompany(companyId);
    redirect(`/companies?archived=${companyId}`);
  }

  async function removeContact(formData: FormData) {
    "use server";
    const contactId = Number(formData.get("contactId"));
    const snapshot = await snapshotContact(contactId);
    await deleteContact(contactId);
    redirect(removedHref(companyId, snapshot));
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
    revalidatePath(`/companies/${companyId}`);
  }

  async function updateField(formData: FormData) {
    "use server";
    const field = formData.get("field");
    const raw = formData.get("value");
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field === "name") {
      if (!value) throw new Error("Name can't be empty.");
      await updateCompanyFields(companyId, { name: value });
    } else if (field === "website") {
      await updateCompanyFields(companyId, { website: value || null });
    } else if (field === "source") {
      await updateCompanyFields(companyId, { source: value || null });
    } else if (
      field === "status" &&
      (COMPANY_STATUSES as readonly string[]).includes(value)
    ) {
      await updateCompanyFields(companyId, { status: value as CompanyStatus });
    } else {
      throw new Error("That field can't be edited here.");
    }
    revalidatePath(`/companies/${companyId}`);
  }

  async function gotReply(formData: FormData) {
    "use server";
    await markReplyReceived(Number(formData.get("taskId")));
    redirect(`/companies/${companyId}`);
  }

  async function removeActivity(formData: FormData) {
    "use server";
    const activityId = Number(formData.get("activityId"));
    const snapshot = await snapshotActivity(activityId);
    await deleteActivity(activityId);
    redirect(removedHref(companyId, snapshot));
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
    const snapshot = await snapshotTask(taskId);
    await deleteTask(taskId);
    redirect(removedHref(companyId, snapshot));
  }

  async function undoRemoval() {
    "use server";
    if (removed) {
      await restoreRemoved(removed);
      revalidatePath(`/companies/${companyId}`);
    }
  }

  const websiteHref = company.website
    ? /^https?:\/\//.test(company.website)
      ? company.website
      : `https://${company.website}`
    : null;
  const openDeals = deals.filter(
    (d) => d.stage !== "won" && d.stage !== "lost",
  );
  const awaitingByActivity = new Map(
    tasks
      .filter((t) => t.kind === "awaiting_reply" && !t.doneAt)
      .map((t) => [t.activityId, t.id]),
  );
  const link = cn(
    buttonVariants({ variant: "secondary", size: "sm" }),
    "whitespace-nowrap",
  );

  const contactParam = typeof query.contact === "string" ? query.contact : "";
  const editingContact =
    contactParam && contactParam !== "new"
      ? contacts.find((c) => c.id === Number(contactParam))
      : undefined;
  const contactSheetOpen =
    contactParam === "new" || editingContact !== undefined;
  const dealParam = typeof query.deal === "string" ? query.deal : "";
  const editingDeal =
    dealParam && dealParam !== "new"
      ? deals.find((d) => d.id === Number(dealParam))
      : undefined;
  const dealSheetOpen = dealParam === "new" || editingDeal !== undefined;
  const removed = parseSnapshot(
    typeof query.removed === "string" ? query.removed : undefined,
  );
  const savedMessage =
    typeof query.saved === "string" ? SAVED_MESSAGE[query.saved] : undefined;

  return (
    <div
      data-business={company.business}
      className="flex flex-1 flex-col gap-6 p-4 md:p-8"
    >
      {savedMessage && <ToastOnMount message={savedMessage} />}
      {removed && removed.row.companyId === companyId && (
        <UndoToastOnMount
          key={`${removed.kind}-${removed.row.id}`}
          message={REMOVED_LABEL[removed.kind]}
          undo={undoRemoval}
          undoneMessage="Restored."
        />
      )}
      {contactSheetOpen && (
        <ContactSheet
          key={editingContact?.id ?? "new"}
          action={saveContactAction.bind(
            null,
            companyId,
            editingContact?.id ?? null,
          )}
          closeHref={`/companies/${companyId}`}
          companyName={company.name}
          defaultValues={editingContact}
        />
      )}
      {dealSheetOpen && (
        <DealSheet
          key={editingDeal?.id ?? "new"}
          action={saveDealAction.bind(null, companyId, editingDeal?.id ?? null)}
          closeHref={`/companies/${companyId}`}
          companyName={company.name}
          defaultBilling={company.business === "trazo" ? "monthly" : "one_time"}
          billingOptions={DEAL_BILLING.map((value) => ({
            value,
            label: DEAL_BILLING_LABEL[value],
          }))}
          defaultValues={editingDeal}
        />
      )}
      <PageHeader
        title={company.name}
        description={
          lastActivityAt
            ? `Last activity ${formatDaysAgo(lastActivityAt)}`
            : undefined
        }
        actions={
          <>
            <a href="#composer" className={link}>
              <Plus className="size-4" aria-hidden="true" />
              Log activity
            </a>
            <a href="#followups" className={link}>
              Add follow-up
            </a>
            <Link
              href={`/companies/${company.id}?contact=new`}
              className={link}
            >
              Add contact
            </Link>
            <ConfirmSubmit
              action={archive}
              trigger="Archive"
              title={`Archive ${company.name}?`}
              description="It leaves the lists and Home. Its contacts, deals, and history are kept."
              confirmLabel="Archive company"
            />
          </>
        }
      />
      <div className="-mt-3 flex flex-wrap items-center gap-2">
        <BusinessBadge business={company.business} />
        <StatusBadge status={company.status} />
        {websiteHref && (
          <a
            href={websiteHref}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            {company.website}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        )}
        {openDeals.length > 0 && (
          <Badge tone="info">
            {openDeals.length} open {openDeals.length === 1 ? "deal" : "deals"}
          </Badge>
        )}
      </div>

      <CompanyColumns
        overview={
          <div className="flex min-w-0 flex-col gap-4">
            <Card>
              <h2 className="mb-2 text-sm font-semibold">Details</h2>
              <dl className="flex flex-col gap-1 text-sm">
                {(
                  [
                    ["Name", "name", company.name, undefined],
                    ["Status", "status", company.status, COMPANY_STATUSES],
                    ["Website", "website", company.website ?? "", undefined],
                    ["Source", "source", company.source ?? "", undefined],
                  ] as const
                ).map(([label, key, value, statuses]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[5rem_1fr] items-center gap-2"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>
                      <InlineField
                        action={updateField}
                        field={key}
                        label={label}
                        value={value}
                        placeholder={`Add ${label.toLowerCase()}`}
                        options={statuses?.map((v) => ({
                          value: v,
                          label: STATUS_LABEL[v],
                        }))}
                        display={
                          key === "status" ? (
                            <StatusBadge status={company.status} />
                          ) : undefined
                        }
                      />
                    </dd>
                  </div>
                ))}
                <div className="grid grid-cols-[5rem_1fr] items-center gap-2 py-1">
                  <dt className="text-muted-foreground">Business</dt>
                  <dd>{BUSINESS_LABEL[company.business]}</dd>
                </div>
                <div className="grid grid-cols-[5rem_1fr] items-center gap-2 py-1">
                  <dt className="text-muted-foreground">Added</dt>
                  <dd className="num">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Contacts</h2>
                <Link
                  href={`/companies/${company.id}?contact=new`}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  Add
                </Link>
              </div>
              {contacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No contacts yet. Add the people you work with here.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {contacts.map((contact) => (
                    <li
                      key={contact.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Avatar name={contact.name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{contact.name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {[contact.title, contact.email, contact.phone]
                            .filter(Boolean)
                            .join(" · ") || "No details"}
                        </p>
                      </div>
                      <Link
                        href={`/companies/${company.id}?contact=${contact.id}`}
                        className="text-muted-foreground hover:text-foreground"
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
                          className="text-danger inline-flex items-center hover:underline max-md:min-h-(--tap-target) max-md:px-2"
                        >
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Deals</h2>
                <Link
                  href="/deals"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  Open board
                </Link>
              </div>
              {deals.length === 0 ? (
                <p className="text-muted-foreground mb-3 text-sm">
                  No deals yet. Add one to start tracking the pipeline.
                </p>
              ) : (
                <ul className="mb-3 flex flex-col gap-3">
                  {deals.map((deal) => (
                    <li
                      key={deal.id}
                      className="border-border rounded-md border p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{deal.title}</p>
                          <p className="text-muted-foreground">
                            <span className="num">
                              {formatCents(deal.amountCents)}
                            </span>{" "}
                            · {DEAL_BILLING_LABEL[deal.billing]}
                            {deal.closeDate &&
                              ` · closes ${formatDueDate(deal.closeDate)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <Link
                            href={`/companies/${company.id}?deal=${deal.id}`}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center hover:underline max-md:min-h-(--tap-target) max-md:px-2"
                          >
                            Edit
                          </Link>
                          <form action={removeDeal}>
                            <input
                              type="hidden"
                              name="dealId"
                              value={deal.id}
                            />
                            <button
                              type="submit"
                              className="text-danger inline-flex shrink-0 items-center hover:underline max-md:min-h-(--tap-target) max-md:px-2"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>
                      <form
                        action={moveDeal}
                        className="mt-2 flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="dealId" value={deal.id} />
                        <select
                          name="stage"
                          aria-label={`Stage for ${deal.title}`}
                          defaultValue={deal.stage}
                          className="border-border-strong bg-surface-raised h-8 rounded-md border px-2 text-sm"
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
                          aria-label="Reason if lost"
                          defaultValue={deal.lostReason ?? ""}
                          placeholder="Reason if Lost"
                          className="border-border-strong bg-surface-raised h-8 min-w-32 flex-1 rounded-md border px-2 text-sm"
                        />
                        <button
                          type="submit"
                          className={cn(
                            buttonVariants({
                              variant: "secondary",
                              size: "sm",
                            }),
                          )}
                        >
                          Update
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/companies/${company.id}?deal=new`}
                className={cn(buttonVariants({ variant: "secondary" }))}
              >
                Add deal
              </Link>
            </Card>

            <Card id="followups" className="scroll-mt-20">
              <h2 className="mb-2 text-sm font-semibold">Follow-ups</h2>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground mb-3 text-sm">
                  No follow-ups yet. Add one so nothing slips.
                </p>
              ) : (
                <ul className="mb-3 flex flex-col">
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      className="border-border flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0"
                    >
                      <div
                        className={cn(
                          "min-w-0",
                          task.doneAt && "text-muted-foreground line-through",
                        )}
                      >
                        <p className="truncate font-medium">{task.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {task.dueDate && (
                            <span className="num">
                              {formatDueDate(task.dueDate)}
                            </span>
                          )}
                          {task.ownerEmail &&
                            ` · ${ownerLabel(task.ownerEmail)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-3">
                        {task.kind === "awaiting_reply" && !task.doneAt && (
                          <form action={gotReply}>
                            <input
                              type="hidden"
                              name="taskId"
                              value={task.id}
                            />
                            <button
                              type="submit"
                              className="text-accent inline-flex items-center font-medium hover:underline max-md:min-h-(--tap-target) max-md:px-2"
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
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {task.doneAt ? "Reopen" : "Done"}
                          </button>
                        </form>
                        <form action={removeTask}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <button
                            type="submit"
                            className="text-danger inline-flex items-center hover:underline max-md:min-h-(--tap-target) max-md:px-2"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form
                action={addTask}
                className="border-border flex flex-wrap items-end gap-2 border-t pt-3 text-xs"
              >
                <label className="flex min-w-40 flex-1 flex-col gap-1">
                  <span className="text-muted-foreground">
                    What&apos;s next
                  </span>
                  <input
                    name="title"
                    required
                    placeholder="Send proposal"
                    className="border-border-strong bg-surface-raised h-9 rounded-md border px-3 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Due</span>
                  <input
                    name="dueDate"
                    type="date"
                    className="border-border-strong bg-surface-raised h-9 rounded-md border px-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  Add follow-up
                </button>
              </form>
            </Card>
          </div>
        }

        activity={
          <div className="flex min-w-0 flex-col gap-4">
            <div id="composer" className="scroll-mt-20">
              <Composer
                action={addActivity}
                contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
              />
            </div>

            <section aria-labelledby="timeline-heading">
              <h2 id="timeline-heading" className="mb-3 text-sm font-semibold">
                Timeline
              </h2>
              {timeline.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nothing yet. Log a note, email, call, or meeting above and it
                  shows up here with finished follow-ups and deal changes.
                </p>
              ) : (
                <ol className="border-border flex flex-col border-l">
                  {timeline.map((item, index) => {
                    const Icon =
                      item.kind === "activity"
                        ? ACTIVITY_ICON[item.type]
                        : item.kind === "task_done"
                          ? CheckCircle2
                          : item.kind === "deal_created"
                            ? Handshake
                            : ArrowRightLeft;
                    return (
                      <li key={index} className="relative pb-5 pl-6 text-sm">
                        <span className="bg-surface-raised border-border text-muted-foreground absolute -left-3 flex size-6 items-center justify-center rounded-full border">
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {item.kind === "activity" && (
                              <>
                                <p className="font-medium">
                                  {ACTIVITY_TYPE_LABEL[item.type]}
                                  {item.subject ? `: ${item.subject}` : ""}
                                </p>
                                {item.body && (
                                  <p className="mt-0.5 whitespace-pre-wrap">
                                    {item.body}
                                  </p>
                                )}
                              </>
                            )}
                            {item.kind === "task_done" && (
                              <p>
                                <span className="font-medium">
                                  Completed follow-up:
                                </span>{" "}
                                {item.title}
                              </p>
                            )}
                            {item.kind === "deal_created" && (
                              <p>
                                <span className="font-medium">New deal:</span>{" "}
                                {item.title}
                              </p>
                            )}
                            {item.kind === "stage_change" && (
                              <p>
                                <span className="font-medium">
                                  {item.dealTitle}:
                                </span>{" "}
                                {item.fromStage
                                  ? `${DEAL_STAGE_LABEL[item.fromStage]} → `
                                  : "moved to "}
                                {DEAL_STAGE_LABEL[item.toStage]}
                              </p>
                            )}
                            <p className="text-muted-foreground num mt-0.5 text-xs">
                              {item.kind === "activity" &&
                              item.type === "meeting"
                                ? formatMeetingTime(item.at, item.endsAt)
                                : formatTimestamp(item.at)}
                              {item.kind === "activity" &&
                                item.ownerEmail &&
                                ` · ${ownerLabel(item.ownerEmail)}`}
                            </p>
                          </div>
                          {item.kind === "activity" && (
                            <form action={removeActivity}>
                              <input
                                type="hidden"
                                name="activityId"
                                value={item.id}
                              />
                              <button
                                type="submit"
                                className="text-muted-foreground hover:text-danger text-xs"
                              >
                                Delete
                              </button>
                            </form>
                          )}
                        </div>
                        {item.kind === "activity" &&
                          item.type === "email_sent" &&
                          awaitingByActivity.has(item.id) && (
                            <form action={gotReply} className="mt-1">
                              <input
                                type="hidden"
                                name="taskId"
                                value={awaitingByActivity.get(item.id)}
                              />
                              <button
                                type="submit"
                                className="text-accent inline-flex items-center text-xs font-medium hover:underline max-md:min-h-(--tap-target) max-md:px-2"
                              >
                                Got reply
                              </button>
                            </form>
                          )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        }
      />

      <Link
        href="/companies"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        Back to companies
      </Link>
    </div>
  );
}
