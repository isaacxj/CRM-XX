import { getHomeCounts } from "@/server/db/companies";
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

export default async function Home() {
  const counts = await Promise.all(
    BUSINESSES.map((business) => getHomeCounts(business)),
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
        {BUSINESSES.map((business, index) => {
          const stats = counts[index];
          return (
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
                  <dd className="text-2xl font-semibold">
                    {stats.companyCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-zinc-500">Clients</dt>
                  <dd className="text-2xl font-semibold">
                    {stats.clientCount}
                  </dd>
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
            </section>
          );
        })}
      </div>
    </div>
  );
}
