import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";

import { BusinessBadge } from "@/components/kit/status-badges";
import { PageHeader } from "@/components/kit/page-header";
import { StatCard } from "@/components/kit/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WhoFilter, parseWho } from "@/components/who-filter";
import { formatDaysAgo, formatMeetingTime, ownerLabel } from "@/lib/activity";
import {
  listUpcomingMeetings,
  markReplyReceived,
} from "@/server/db/activities";
import { COLD_AFTER_DAYS, listGoingCold } from "@/server/db/companies";
import { getPipelineSnapshot } from "@/server/db/deals";
import { BUSINESSES, type Business } from "@/server/db/schema";
import {
  completeTask,
  listTodayFollowUps,
  listWaitingOnReply,
  snoozeTask,
} from "@/server/db/tasks";
import { getCurrentUserEmail } from "@/server/user";

const STAGE_LABEL: Record<string, string> = {
  qualified: "Qualified",
  discovery: "Discovery",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  demo: "Demo",
  pilot: "Pilot",
  proposal: "Proposal",
};

const SNOOZE_OPTIONS = [
  { days: 1, label: "Tomorrow" },
  { days: 3, label: "In 3 days" },
  { days: 7, label: "Next week" },
] as const;

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDueDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDayHeading(dateStr: string, today: string) {
  if (dateStr === today) return "Today";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
      {children}
      {count !== undefined && count > 0 && (
        <span className="num text-muted-foreground text-xs font-normal">
          {count}
        </span>
      )}
    </h2>
  );
}

export default async function Today({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const me = await getCurrentUserEmail();
  const who = me ? parseWho(params.who) : "everyone";
  const owner = who === "mine" ? me : null;
  const business = (BUSINESSES as readonly string[]).includes(
    String(params.business),
  )
    ? (params.business as Business)
    : undefined;

  const query = new URLSearchParams();
  if (business) query.set("business", business);
  if (who === "mine") query.set("who", "mine");
  const here = query.size > 0 ? `/?${query}` : "/";

  const [followUps, waiting, meetings, pipeline, ...coldLists] =
    await Promise.all([
      listTodayFollowUps(business, owner),
      listWaitingOnReply(business, owner),
      listUpcomingMeetings(7, owner),
      getPipelineSnapshot(business),
      ...(business ? [business] : BUSINESSES).map(async (b) =>
        (await listGoingCold(b)).map((c) => ({ ...c, business: b })),
      ),
    ]);
  const cold = coldLists
    .flat()
    .sort((a, b) => a.lastActivityAt.localeCompare(b.lastActivityAt));
  const visibleMeetings = business
    ? meetings.filter((m) => m.business === business)
    : meetings;

  const overdue = followUps.filter((t) => t.dueDate && t.dueDate < today);
  const dueToday = followUps.filter((t) => !t.dueDate || t.dueDate >= today);
  const waitingOverdue = waiting.filter((w) => w.overdue).length;
  const meetingsToday = visibleMeetings.filter(
    (m) => m.occurredAt.slice(0, 10) === today,
  ).length;

  const meetingDays = new Map<string, typeof visibleMeetings>();
  for (const m of visibleMeetings) {
    const day = m.occurredAt.slice(0, 10);
    meetingDays.set(day, [...(meetingDays.get(day) ?? []), m]);
  }

  const stages = new Map<string, { count: number; cents: number }>();
  for (const row of pipeline) {
    const prev = stages.get(row.stage) ?? { count: 0, cents: 0 };
    stages.set(row.stage, {
      count: prev.count + row.count,
      cents: prev.cents + row.cents,
    });
  }
  const stageRows = [...stages.entries()].sort(
    (a, b) => b[1].cents - a[1].cents,
  );
  const maxCents = Math.max(1, ...stageRows.map(([, v]) => v.cents));
  const totalCents = stageRows.reduce((sum, [, v]) => sum + v.cents, 0);
  const openDeals = stageRows.reduce((sum, [, v]) => sum + v.count, 0);

  async function complete(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    if (Number.isInteger(id)) await completeTask(id);
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
    if (Number.isInteger(id)) await markReplyReceived(id);
    redirect(here);
  }

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Today"
        description={todayLabel}
        actions={
          me && (
            <WhoFilter
              who={who}
              hrefFor={(w) => {
                const q = new URLSearchParams();
                if (business) q.set("business", business);
                if (w === "mine") q.set("who", "mine");
                return q.size > 0 ? `/?${q}` : "/";
              }}
            />
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Overdue follow-ups"
          value={overdue.length}
          hint={overdue.length === 0 ? "All caught up" : "Needs attention"}
        />
        <StatCard label="Due today" value={dueToday.length} />
        <StatCard
          label="Waiting on reply"
          value={waiting.length}
          hint={waitingOverdue > 0 ? `${waitingOverdue} overdue` : undefined}
        />
        <StatCard label="Meetings today" value={meetingsToday} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="follow-ups">
            <SectionTitle count={followUps.length}>
              <span id="follow-ups">Follow-ups</span>
            </SectionTitle>
            {followUps.length === 0 ? (
              <Card className="text-muted-foreground text-sm">
                Nothing due. Add a follow-up from a company page or{" "}
                <Link href="/?quick=activity" className="text-accent underline">
                  Quick add
                </Link>
                .
              </Card>
            ) : (
              <Card className="divide-border divide-y p-0">
                {followUps.map((task) => {
                  const late = task.dueDate !== null && task.dueDate < today;
                  return (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                    >
                      <form action={complete}>
                        <input type="hidden" name="id" value={task.id} />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          className="size-8 px-0 max-md:size-(--tap-target)"
                          aria-label={`Mark done: ${task.title}`}
                        >
                          <Check className="size-4" />
                        </Button>
                      </form>
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="truncate text-sm font-medium">
                          {task.title}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {task.companyId ? (
                            <Link
                              href={`/companies/${task.companyId}`}
                              className="hover:underline"
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
                      <Badge tone={late ? "danger" : "warning"} className="num">
                        {task.dueDate
                          ? late
                            ? `Due ${formatDueDate(task.dueDate)}`
                            : "Today"
                          : "No date"}
                      </Badge>
                      <form
                        action={snooze}
                        className="flex gap-1"
                        aria-label={`Snooze: ${task.title}`}
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
                          >
                            {o.label}
                          </Button>
                        ))}
                      </form>
                    </div>
                  );
                })}
              </Card>
            )}
          </section>

          <section aria-labelledby="waiting">
            <SectionTitle count={waiting.length}>
              <span id="waiting">Waiting on reply</span>
            </SectionTitle>
            {waiting.length === 0 ? (
              <Card className="text-muted-foreground text-sm">
                No sent emails waiting on a reply. Log a sent email on a company
                and set a reminder to track it here.
              </Card>
            ) : (
              <Card className="divide-border divide-y p-0">
                {waiting.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-sm font-medium">
                        {task.title.replace(/^Waiting on reply:?\s*/, "") ||
                          "Sent email"}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {task.companyId ? (
                          <Link
                            href={`/companies/${task.companyId}`}
                            className="hover:underline"
                          >
                            {task.companyName}
                          </Link>
                        ) : (
                          "No company"
                        )}
                        {task.ownerEmail && ` · ${ownerLabel(task.ownerEmail)}`}
                      </p>
                    </div>
                    <Badge
                      tone={task.overdue ? "danger" : "neutral"}
                      className="num"
                    >
                      {task.overdue ? "No reply · " : "Reply by "}
                      {task.dueDate ? formatDueDate(task.dueDate) : "any day"}
                    </Badge>
                    <form action={gotReply}>
                      <input type="hidden" name="id" value={task.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        Got reply
                      </Button>
                    </form>
                  </div>
                ))}
              </Card>
            )}
          </section>

          <section aria-labelledby="cold">
            <SectionTitle count={cold.length}>
              <span id="cold">Going cold</span>
            </SectionTitle>
            {cold.length === 0 ? (
              <Card className="text-muted-foreground text-sm">
                No prospects or open deals have gone quiet for {COLD_AFTER_DAYS}
                + days.
              </Card>
            ) : (
              <Card className="divide-border divide-y p-0">
                {cold.map((c) => (
                  <Link
                    key={c.id}
                    href={`/companies/${c.id}`}
                    className="hover:bg-surface-hover flex items-center gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {c.name}
                    </span>
                    <BusinessBadge business={c.business} />
                    <span className="text-muted-foreground hidden text-xs sm:inline">
                      {c.status === "prospect" ? "Prospect" : "Open deal"}
                    </span>
                    <span className="text-muted-foreground num text-xs">
                      {formatDaysAgo(c.lastActivityAt)}
                    </span>
                  </Link>
                ))}
              </Card>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="meetings">
            <SectionTitle count={visibleMeetings.length}>
              <span id="meetings">Meetings this week</span>
            </SectionTitle>
            {visibleMeetings.length === 0 ? (
              <Card className="text-muted-foreground text-sm">
                No meetings in the next 7 days. Log one from a company page or
                Quick add.
              </Card>
            ) : (
              <Card className="flex flex-col gap-4">
                {[...meetingDays.entries()].map(([day, items]) => (
                  <div key={day}>
                    <p className="text-muted-foreground mb-2 text-xs font-medium">
                      {formatDayHeading(day, today)}
                    </p>
                    <ol className="border-border flex flex-col gap-3 border-l pl-3">
                      {items.map((m) => (
                        <li key={m.id} className="text-sm">
                          <Link
                            href={`/companies/${m.companyId}`}
                            className="font-medium hover:underline"
                          >
                            {m.subject || "Meeting"}
                          </Link>
                          <p className="text-muted-foreground num text-xs">
                            {formatMeetingTime(m.occurredAt, m.endsAt)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {m.companyName}
                            {m.contactName && ` · ${m.contactName}`}
                            {m.ownerEmail && ` · ${ownerLabel(m.ownerEmail)}`}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </Card>
            )}
          </section>

          <section aria-labelledby="pipeline">
            <SectionTitle>
              <span id="pipeline">Pipeline</span>
            </SectionTitle>
            <Card>
              {stageRows.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No open deals yet. Add one from a company page.
                </p>
              ) : (
                <>
                  <p className="num text-xl font-semibold">
                    {formatCents(totalCents)}
                  </p>
                  <p className="text-muted-foreground mb-4 text-xs">
                    {openDeals} open {openDeals === 1 ? "deal" : "deals"}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {stageRows.map(([stage, v]) => (
                      <li key={stage}>
                        <div className="mb-1 flex items-baseline justify-between text-xs">
                          <span>
                            {STAGE_LABEL[stage] ?? stage}{" "}
                            <span className="text-muted-foreground num">
                              · {v.count}
                            </span>
                          </span>
                          <span className="num text-muted-foreground">
                            {formatCents(v.cents)}
                          </span>
                        </div>
                        <div
                          className="bg-muted h-1.5 rounded-full"
                          role="img"
                          aria-label={`${STAGE_LABEL[stage] ?? stage}: ${formatCents(v.cents)}`}
                        >
                          <div
                            className="bg-accent h-full rounded-full"
                            style={{ width: `${(v.cents / maxCents) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
