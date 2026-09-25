import Link from "next/link";
import { redirect } from "next/navigation";

import { listDealsForBoard, moveDealStage } from "@/server/db/deals";
import {
  BUSINESSES,
  STATIXX_STAGES,
  TRAZO_STAGES,
  type Business,
  type DealBilling,
  type DealStage,
} from "@/server/db/schema";

const BUSINESS_LABEL: Record<Business, string> = {
  statixx: "Statixx",
  trazo: "Trazo",
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

export default async function DealsPage({
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
  const stages = business === "statixx" ? STATIXX_STAGES : TRAZO_STAGES;

  const deals = await listDealsForBoard(business);

  async function moveDeal(formData: FormData) {
    "use server";
    const dealId = Number(formData.get("dealId"));
    const stage = formData.get("stage");
    const lostReason = formData.get("lostReason");
    const forBusiness = formData.get("business");

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
    redirect(
      `/deals?business=${typeof forBusiness === "string" ? forBusiness : business}`,
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Deals</h1>
        <div className="flex gap-2">
          {BUSINESSES.map((value) => (
            <Link
              key={value}
              href={`/deals?business=${value}`}
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

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage === stage);
          const stageTotal = stageDeals.reduce(
            (sum, deal) => sum + deal.amountCents,
            0,
          );

          return (
            <div
              key={stage}
              className="flex w-64 shrink-0 flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div>
                <h2 className="text-sm font-semibold">
                  {DEAL_STAGE_LABEL[stage]}
                </h2>
                <p className="text-xs text-zinc-500">
                  {stageDeals.length} · {formatCents(stageTotal)}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {stageDeals.length === 0 && (
                  <p className="text-xs text-zinc-400">No deals</p>
                )}
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded border border-zinc-100 p-3 text-sm dark:border-zinc-900"
                  >
                    <Link
                      href={`/companies/${deal.companyId}`}
                      className="font-medium hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <p className="text-zinc-500">{deal.companyName}</p>
                    <p className="mt-1 text-zinc-500">
                      {formatCents(deal.amountCents)} ·{" "}
                      {DEAL_BILLING_LABEL[deal.billing]}
                    </p>
                    <form
                      action={moveDeal}
                      className="mt-2 flex flex-col gap-2"
                    >
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="business" value={business} />
                      <select
                        name="stage"
                        defaultValue={deal.stage}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {stages.map((s) => (
                          <option key={s} value={s}>
                            {DEAL_STAGE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <input
                        name="lostReason"
                        type="text"
                        defaultValue={deal.lostReason ?? ""}
                        placeholder="Reason if Lost"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <button
                        type="submit"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium dark:border-zinc-700"
                      >
                        Move
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
