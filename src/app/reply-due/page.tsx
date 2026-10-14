import Link from "next/link";
import { redirect } from "next/navigation";

import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { BusinessBadge } from "@/components/kit/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  firstProblem,
  formObject,
  replyDueInput,
  withProblem,
} from "@/lib/action-input";
import { daysSince } from "@/lib/stalled";
import { createActivity } from "@/server/db/activities";
import { REPLY_DUE_CAP, listRepliesDue } from "@/server/db/replies";
import { BUSINESSES } from "@/server/db/schema";
import { createTask } from "@/server/db/tasks";

const BUSINESS_LABEL = { statixx: "Statixx", trazo: "Trazo" } as const;
const REMIND = [
  { days: 1, label: "Tomorrow" },
  { days: 3, label: "In 3 days" },
  { days: 7, label: "In a week" },
];

export default async function ReplyDuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const business = BUSINESSES.find((value) => value === params.business);
  const done = typeof params.done === "string" ? params.done : "";

  const query = new URLSearchParams();
  if (business) query.set("business", business);
  if (q) query.set("q", q);
  const here = query.size ? `/reply-due?${query}` : "/reply-due";

  async function logReply(formData: FormData) {
    "use server";
    const parsed = replyDueInput.safeParse(formObject(formData));
    if (!parsed.success)
      redirect(withProblem(here, firstProblem(parsed.error)));
    const subject = parsed.data.subject
      ? parsed.data.subject.replace(/^re:\s*/i, "")
      : "";
    await createActivity({
      companyId: parsed.data.companyId,
      type: "email_sent",
      subject: subject ? `Re: ${subject}` : "Reply",
      body: "",
      occurredAt: new Date().toISOString(),
    });
    const next = new URLSearchParams(query);
    next.set("done", "Reply logged.");
    redirect(`/reply-due?${next}`);
  }

  async function remind(formData: FormData) {
    "use server";
    const parsed = replyDueInput.safeParse(formObject(formData));
    if (!parsed.success || !parsed.data.days)
      redirect(
        withProblem(
          here,
          parsed.success
            ? "Pick tomorrow, 3 days, or a week."
            : firstProblem(parsed.error),
        ),
      );
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + parsed.data.days);
    await createTask(parsed.data.companyId, {
      title: parsed.data.subject
        ? `Reply to: ${parsed.data.subject}`
        : "Reply to email",
      dueDate: due.toISOString().slice(0, 10),
    });
    const next = new URLSearchParams(query);
    next.set("done", "Reply reminder added.");
    redirect(`/reply-due?${next}`);
  }

  const rows = (await listRepliesDue({ business, q: q || undefined })).map(
    (row) => ({ ...row, days: daysSince(row.receivedAt) }),
  );
  const hasFilters = Boolean(q || business);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 pb-24 md:p-8 md:pb-8">
      <PageHeader
        title="Reply due"
        description="Emails you received that nobody has answered yet, longest wait first. Log your reply once you've sent it, or set a reminder."
      />

      {done ? (
        <p role="status" className="text-success text-sm">
          {done}
        </p>
      ) : null}

      <form className="flex flex-wrap items-end gap-3" method="get">
        <div className="flex flex-col gap-1">
          <label htmlFor="business" className="text-muted-foreground text-xs">
            Business
          </label>
          <select
            id="business"
            name="business"
            defaultValue={business ?? ""}
            className="border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm"
          >
            <option value="">All</option>
            {BUSINESSES.map((value) => (
              <option key={value} value={value}>
                {BUSINESS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-muted-foreground text-xs">
            Search companies
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Company name"
            className="w-72"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {hasFilters ? (
          <Link
            href="/reply-due"
            className="text-muted-foreground hover:text-foreground self-center text-sm hover:underline"
          >
            Clear filters
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No unanswered emails match these filters. Try fewer words or clear the filters."
              : "You're caught up. Emails you receive show up here until you log a reply."
          }
          action={
            <Link
              href="/companies"
              className="text-accent text-sm font-medium hover:underline"
            >
              Go to companies
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            <span className="num">{rows.length}</span>{" "}
            {rows.length === 1 ? "email" : "emails"} waiting for your reply
          </p>
          <DataTable>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Email</Th>
                <Th>Waiting</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.activityId}>
                  <Td>
                    <Link
                      href={`/companies/${row.companyId}`}
                      className="font-medium hover:underline"
                    >
                      {row.companyName}
                    </Link>{" "}
                    <BusinessBadge business={row.business} />
                  </Td>
                  <Td>
                    <div>{row.subject || "No subject"}</div>
                    {row.contactName ? (
                      <div className="text-muted-foreground text-xs">
                        From {row.contactName}
                      </div>
                    ) : null}
                  </Td>
                  <Td
                    className={`num whitespace-nowrap ${row.days >= 3 ? "text-danger" : "text-muted-foreground"}`}
                  >
                    {row.days === 0
                      ? "Today"
                      : row.days === 1
                        ? "1 day"
                        : `${row.days} days`}
                    {row.openReplyTasks > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · reminder set
                      </span>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <form action={logReply}>
                        <input
                          type="hidden"
                          name="companyId"
                          value={row.companyId}
                        />
                        <input
                          type="hidden"
                          name="subject"
                          value={row.subject ?? ""}
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          aria-label={`Log reply sent to ${row.companyName}`}
                        >
                          Log reply sent
                        </Button>
                      </form>
                      <form action={remind} className="flex gap-1">
                        <input
                          type="hidden"
                          name="companyId"
                          value={row.companyId}
                        />
                        <input
                          type="hidden"
                          name="subject"
                          value={row.subject ?? ""}
                        />
                        {REMIND.map(({ days, label }) => (
                          <Button
                            key={days}
                            type="submit"
                            name="days"
                            value={days}
                            variant="secondary"
                            size="sm"
                            aria-label={`Remind me to reply to ${row.companyName} ${label.toLowerCase()}`}
                          >
                            {label}
                          </Button>
                        ))}
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
      {rows.length >= REPLY_DUE_CAP ? (
        <p className="text-muted-foreground text-sm">
          Showing the {REPLY_DUE_CAP} longest waits. Filter by business or
          search to narrow the list.
        </p>
      ) : null}
    </div>
  );
}
