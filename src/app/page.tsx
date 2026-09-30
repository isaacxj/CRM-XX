import Link from "next/link";

import { WhoFilter, parseWho } from "@/components/who-filter";
import { formatMeetingTime, ownerLabel } from "@/lib/activity";
import { listUpcomingMeetings } from "@/server/db/activities";
import { getHomeCounts } from "@/server/db/companies";
import { getCurrentUserEmail } from "@/server/user";
import { listDueFollowUps, listWaitingOnReply } from "@/server/db/tasks";
import { BUSINESSES, type Business } from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDueDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const me = await getCurrentUserEmail();
  const who = me ? parseWho(params.who) : "everyone";
  const owner = who === "mine" ? me : null;
  const [meetings, data] = await Promise.all([
    listUpcomingMeetings(7, owner),
    Promise.all(
      BUSINESSES.map(async (business) => {
        const [counts, followUps, waiting] = await Promise.all([
          getHomeCounts(business),
          listDueFollowUps(business, owner),
          listWaitingOnReply(business, owner),
        ]);
        return { business, counts, followUps, waiting };
      }),
    ),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CRM-XX</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Companies and pipeline for Statixx and Trazo.
          </p>
        </div>
        {me && (
          <WhoFilter
            who={who}
            hrefFor={(w) => (w === "mine" ? "/?who=mine" : "/")}
          />
        )}
      </div>

      <section className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Upcoming meetings</h2>
        {meetings.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            No meetings in the next 7 days. Log one from a company page or Quick
            add.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {meetings.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm"
              >
                <Link
                  href={`/companies/${m.companyId}`}
                  className="min-w-0 truncate hover:underline"
                >
                  <span className="font-medium">{m.subject || "Meeting"}</span>
                  <span className="text-zinc-500">
                    {" "}
                    · {m.companyName} · {BUSINESS_LABEL[m.business]}
                    {m.contactName && ` · ${m.contactName}`}
                    {m.ownerEmail && ` · ${ownerLabel(m.ownerEmail)}`}
                  </span>
                </Link>
                <span className="shrink-0 text-zinc-600 dark:text-zinc-400">
                  {formatMeetingTime(m.occurredAt, m.endsAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {data.map(({ business, counts: stats, followUps, waiting }) => (
          <section
            key={business}
            className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
          >
            <h2 className="text-lg font-semibold">
              {BUSINESS_LABEL[business]}
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-zinc-500">Companies</dt>
                <dd className="text-2xl font-semibold">{stats.companyCount}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Clients</dt>
                <dd className="text-2xl font-semibold">{stats.clientCount}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Prospects</dt>
                <dd className="text-2xl font-semibold">
                  {stats.prospectCount}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Open deals</dt>
                <dd className="text-2xl font-semibold">
                  {stats.openDealCount}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-zinc-500">Open pipeline</dt>
                <dd className="text-2xl font-semibold">
                  {formatCents(stats.pipelineCents)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-sm text-zinc-500">Open follow-ups</dt>
                <dd className="text-2xl font-semibold">
                  {stats.openTaskCount}
                </dd>
              </div>
            </dl>

            {followUps.length > 0 && (
              <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-500">
                  Overdue and due today
                </h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {followUps.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <Link
                        href={`/companies/${task.companyId}`}
                        className="min-w-0 truncate hover:underline"
                      >
                        {task.title}
                        <span className="text-zinc-500">
                          {" "}
                          · {task.companyName}
                          {task.ownerEmail &&
                            ` · ${ownerLabel(task.ownerEmail)}`}
                        </span>
                      </Link>
                      <span
                        className={
                          task.dueDate && task.dueDate < today
                            ? "shrink-0 font-medium text-red-600"
                            : "shrink-0 text-zinc-500"
                        }
                      >
                        {task.dueDate ? formatDueDate(task.dueDate) : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {waiting.length > 0 && (
              <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-500">
                  Waiting on reply
                </h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {waiting.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <Link
                        href={`/companies/${task.companyId}`}
                        className="min-w-0 truncate hover:underline"
                      >
                        {task.title.replace(/^Waiting on reply:?\s*/, "") ||
                          "Sent email"}
                        <span className="text-zinc-500">
                          {" "}
                          · {task.companyName}
                          {task.ownerEmail &&
                            ` · ${ownerLabel(task.ownerEmail)}`}
                        </span>
                      </Link>
                      <span
                        className={
                          task.overdue
                            ? "shrink-0 rounded bg-red-50 px-1.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "shrink-0 text-zinc-500"
                        }
                      >
                        {task.overdue ? "No reply · " : "Reply by "}
                        {task.dueDate ? formatDueDate(task.dueDate) : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
