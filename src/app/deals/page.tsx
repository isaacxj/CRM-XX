import Link from "next/link";
import { redirect } from "next/navigation";

import { DealBoard } from "@/components/deal-board";
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

function daysSince(timestamp: string) {
  // SQLite timestamps are UTC "YYYY-MM-DD HH:MM:SS".
  const then = new Date(`${timestamp.replace(" ", "T")}Z`).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
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
    <div className="flex flex-1 flex-col gap-6 p-6 pb-4 md:p-8">
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

      <DealBoard
        business={business}
        stages={stages.map((value) => ({
          value,
          label: DEAL_STAGE_LABEL[value],
        }))}
        deals={deals.map((deal) => ({
          id: deal.id,
          title: deal.title,
          stage: deal.stage,
          amountCents: deal.amountCents,
          billingLabel: DEAL_BILLING_LABEL[deal.billing],
          closeDate: deal.closeDate,
          lostReason: deal.lostReason,
          companyId: deal.companyId,
          companyName: deal.companyName,
          daysInStage: daysSince(deal.stageSince),
        }))}
        moveAction={moveDeal}
      />
    </div>
  );
}
