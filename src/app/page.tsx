import Link from "next/link";

import { getHomeCounts } from "@/server/db/companies";
import { listDueFollowUps } from "@/server/db/tasks";
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

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await Promise.all(
    BUSINESSES.map(async (business) => {
      const [counts, followUps] = await Promise.all([
        getHomeCounts(business),
        listDueFollowUps(business),
      ]);
      return { business, counts, followUps };
    }),
  );

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">CRM-XX</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Companies and pipeline for Statixx and Trazo.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {data.map(({ business, counts: stats, followUps }) => (
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
                        className="truncate hover:underline"
                      >
                        {task.title}
                        <span className="text-zinc-500">
                          {" "}
                          · {task.companyName}
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
          </section>
        ))}
      </div>
    </div>
  );
}
