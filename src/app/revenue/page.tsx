import Link from "next/link";

import { getRevenue, type Money } from "@/server/db/revenue";
import {
  BUSINESSES,
  STATIXX_STAGES,
  TRAZO_STAGES,
  type Business,
} from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
};

const STAGE_LABEL: Record<string, string> = {
  qualified: "Qualified",
  discovery: "Discovery",
  proposal_sent: "Proposal sent",
  negotiation: "Negotiation",
  demo: "Demo",
  pilot: "Pilot",
  proposal: "Proposal",
};

function isBusiness(value: string): value is Business {
  return (BUSINESSES as readonly string[]).includes(value);
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatMoney(money: Money) {
  const parts: string[] = [];
  if (money.oneTimeCents > 0 || money.monthlyCents === 0) {
    parts.push(formatCents(money.oneTimeCents));
  }
  if (money.monthlyCents > 0) {
    parts.push(`${formatCents(money.monthlyCents)}/mo`);
  }
  return parts.join(" + ");
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const businessParam =
    typeof params.business === "string" ? params.business : "";
  const business: Business = isBusiness(businessParam)
    ? businessParam
    : "statixx";
  const openStages = (
    business === "statixx" ? STATIXX_STAGES : TRAZO_STAGES
  ).filter((stage) => stage !== "won" && stage !== "lost");

  const revenue = await getRevenue(business);
  const byStage = new Map(revenue.pipeline.map((row) => [row.stage, row]));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Revenue</h1>
        <div className="flex gap-2">
          {BUSINESSES.map((value) => (
            <Link
              key={value}
              href={`/revenue?business=${value}`}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                value === business
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {BUSINESS_LABEL[value]}
            </Link>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Won this month"
          value={formatMoney(revenue.wonThisMonth.money)}
          note={`${revenue.wonThisMonth.count} deals`}
        />
        <Stat
          label="Won this quarter"
          value={formatMoney(revenue.wonThisQuarter.money)}
          note={`${revenue.wonThisQuarter.count} deals`}
        />
        <Stat
          label="Win rate, last 90 days"
          value={
            revenue.winRate.percent === null
              ? "No closed deals"
              : `${revenue.winRate.percent}%`
          }
          note={`${revenue.winRate.won} won, ${revenue.winRate.lost} lost`}
        />
        <Stat
          label="MRR"
          value={formatCents(revenue.mrrCents)}
          note={`${revenue.mrrClients.length} monthly clients`}
        />
      </dl>

      <section>
        <h2 className="text-lg font-semibold">Open pipeline by stage</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="py-2 pr-4 font-medium">Stage</th>
                <th className="py-2 pr-4 font-medium">Deals</th>
                <th className="py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {openStages.map((stage) => {
                const row = byStage.get(stage);
                return (
                  <tr
                    key={stage}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-4">{STAGE_LABEL[stage]}</td>
                    <td className="py-2 pr-4">{row?.count ?? 0}</td>
                    <td className="py-2">
                      {row ? formatMoney(row.money) : formatCents(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Monthly recurring clients</h2>
        {revenue.mrrClients.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            No won monthly deals yet. Move a monthly deal to Won on the{" "}
            <Link href={`/deals?business=${business}`} className="underline">
              deals board
            </Link>{" "}
            and it will count toward MRR.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-100 text-sm dark:divide-zinc-900">
            {revenue.mrrClients.map((client) => (
              <li
                key={`${client.companyId}-${client.dealTitle}`}
                className="flex items-center justify-between py-2"
              >
                <Link
                  href={`/companies/${client.companyId}`}
                  className="hover:underline"
                >
                  {client.companyName}
                  <span className="ml-2 text-zinc-500">{client.dealTitle}</span>
                </Link>
                <span>{formatCents(client.amountCents)}/mo</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
      <dd className="text-xs text-zinc-500">{note}</dd>
    </div>
  );
}
