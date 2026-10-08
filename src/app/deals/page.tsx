import Link from "next/link";
import { Pagination } from "@/components/kit/pagination";
import { pageWindow, parsePage } from "@/lib/pagination";
import { redirect } from "next/navigation";
import { firstProblem, recordId, withProblem } from "@/lib/action-input";
import { LayoutGrid, List } from "lucide-react";

import { DealBoard } from "@/components/deal-board";
import { AgeChip, formatCents } from "@/components/deal-shared";
import { DealPanel } from "@/components/deal-panel";
import { Avatar } from "@/components/kit/avatar";
import { DataTable, EmptyState, Td, Th, Tr } from "@/components/kit/data-table";
import { PageHeader } from "@/components/kit/page-header";
import { StageBadge } from "@/components/kit/status-badges";
import { ToastOnMount } from "@/components/kit/toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listSavedViews } from "@/server/db/savedViews";
import { deleteDealViewAction, saveDealViewAction } from "./view-actions";
import { cn } from "@/lib/cn";
import {
  DEAL_STATUSES,
  type DealFilters,
  type DealStatus,
  getDealDetail,
  BOARD_STAGE_CAP,
  getStageTotals,
  listDealsForBoard,
  moveDealStage,
} from "@/server/db/deals";
import {
  BUSINESSES,
  DEAL_BILLING,
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

const selectCls =
  "border-border-strong bg-surface-raised text-foreground h-9 rounded-md border px-3 text-sm";

function isBusiness(value: string): value is Business {
  return (BUSINESSES as readonly string[]).includes(value);
}

function daysSince(timestamp: string) {
  // SQLite timestamps are UTC "YYYY-MM-DD HH:MM:SS".
  const then = new Date(`${timestamp.replace(" ", "T")}Z`).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function formatDate(timestamp: string) {
  return new Date(`${timestamp.replace(" ", "T")}Z`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
  );
}

const STATUS_LABEL: Record<DealStatus, string> = {
  open: "Open",
  won: "Won",
  lost: "Lost",
};

function dealsHref(
  business: Business,
  view: string,
  deal?: number,
  filters: DealFilters = {},
) {
  const params = new URLSearchParams({ business });
  if (view === "list") params.set("view", "list");
  if (filters.q) params.set("q", filters.q);
  if (filters.billing) params.set("billing", filters.billing);
  if (filters.status) params.set("status", filters.status);
  if (deal) params.set("deal", String(deal));
  return `/deals?${params.toString()}`;
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
  const view = params.view === "list" ? "list" : "board";
  const dealParam = typeof params.deal === "string" ? Number(params.deal) : 0;
  const stages = business === "statixx" ? STATIXX_STAGES : TRAZO_STAGES;
  const qParam =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const filters: DealFilters = {
    q: qParam || undefined,
    billing: DEAL_BILLING.find((b) => b === params.billing),
    status: DEAL_STATUSES.find((s) => s === params.status),
  };
  const hasFilters = Boolean(filters.q || filters.billing || filters.status);
  const savedViews = await listSavedViews("deals");

  const totals = await getStageTotals(business, filters);
  const dealTotal = Object.values(totals).reduce((n, t) => n + t.count, 0);
  const window = pageWindow(parsePage(params.page), dealTotal);

  const [deals, detail] = await Promise.all([
    view === "board"
      ? listDealsForBoard(business, { perStage: BOARD_STAGE_CAP, filters })
      : listDealsForBoard(business, {
          limit: window.limit,
          offset: window.offset,
          filters,
        }),
    Number.isInteger(dealParam) && dealParam > 0
      ? getDealDetail(dealParam)
      : Promise.resolve(null),
  ]);
  // Only open a deal that belongs to the business being shown.
  const panelDeal = detail && detail.business === business ? detail : null;

  async function moveDeal(formData: FormData) {
    "use server";
    const parsedId = recordId.safeParse(formData.get("dealId"));
    if (!parsedId.success) {
      redirect(withProblem("/deals", firstProblem(parsedId.error)));
    }
    const dealId = parsedId.data;
    const stage = formData.get("stage");
    const lostReason = formData.get("lostReason");
    const forBusiness = formData.get("business");
    const forView = formData.get("view");
    const openDeal = formData.get("openDeal") === "1";

    if (
      typeof stage !== "string" ||
      !(stages as readonly string[]).includes(stage)
    ) {
      throw new Error("Pick a valid stage.");
    }

    const target = isBusiness(String(forBusiness))
      ? (forBusiness as Business)
      : business;
    const base = dealsHref(
      target,
      typeof forView === "string" ? forView : "board",
      openDeal ? dealId : undefined,
      filters,
    );

    try {
      await moveDealStage(
        dealId,
        stage as DealStage,
        typeof lostReason === "string" ? lostReason : null,
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Couldn't move that deal.";
      redirect(`${base}&error=${encodeURIComponent(message)}`);
    }
    redirect(
      `${base}&moved=${encodeURIComponent(DEAL_STAGE_LABEL[stage as DealStage])}`,
    );
  }

  const errorMessage = typeof params.error === "string" ? params.error : null;
  const movedTo = typeof params.moved === "string" ? params.moved : null;
  const closeHref = dealsHref(business, view, undefined, filters);
  const viewMsg = typeof params.viewMsg === "string" ? params.viewMsg : null;
  const activeQuery = dealsHref(business, view, undefined, filters).split(
    "?",
  )[1];
  const returnTo = dealsHref(business, view, undefined, filters);
  const countLabel = hasFilters ? "matching" : "in the";

  return (
    <div className="flex flex-1 flex-col gap-5 p-6 pb-24 md:p-8 md:pb-8">
      {movedTo && <ToastOnMount message={`Deal moved to ${movedTo}.`} />}
      {viewMsg && <ToastOnMount message={viewMsg} />}
      <PageHeader
        title="Deals"
        description={`${dealTotal} ${dealTotal === 1 ? "deal" : "deals"} ${countLabel} ${BUSINESS_LABEL[business]} pipeline. Drag a card to change its stage, or open it for details.`}
        actions={
          <>
            <div className="flex gap-1" role="group" aria-label="Business">
              {BUSINESSES.map((value) => (
                <Link
                  key={value}
                  href={dealsHref(value, view, undefined, filters)}
                  aria-current={value === business ? "page" : undefined}
                  className={cn(
                    buttonVariants({
                      variant: value === business ? "primary" : "secondary",
                      size: "sm",
                    }),
                  )}
                >
                  {BUSINESS_LABEL[value]}
                </Link>
              ))}
            </div>
            <div className="flex gap-1" role="group" aria-label="View">
              <Link
                href={dealsHref(business, "board", undefined, filters)}
                aria-label="Board view"
                aria-current={view === "board" ? "page" : undefined}
                className={buttonVariants({
                  variant: view === "board" ? "secondary" : "ghost",
                  size: "sm",
                })}
              >
                <LayoutGrid className="size-4" aria-hidden="true" />
                Board
              </Link>
              <Link
                href={dealsHref(business, "list", undefined, filters)}
                aria-label="List view"
                aria-current={view === "list" ? "page" : undefined}
                className={buttonVariants({
                  variant: view === "list" ? "secondary" : "ghost",
                  size: "sm",
                })}
              >
                <List className="size-4" aria-hidden="true" />
                List
              </Link>
            </div>
          </>
        }
      />

      <form className="flex flex-wrap items-end gap-3" method="get">
        <input type="hidden" name="business" value={business} />
        {view === "list" && <input type="hidden" name="view" value="list" />}
        <div className="flex flex-col gap-1">
          <label htmlFor="deal-q" className="text-muted-foreground text-xs">
            Search deals
          </label>
          <Input
            id="deal-q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder="Deal or company"
            className="w-56"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="deal-billing"
            className="text-muted-foreground text-xs"
          >
            Billing
          </label>
          <select
            id="deal-billing"
            name="billing"
            defaultValue={filters.billing ?? ""}
            className={selectCls}
          >
            <option value="">All</option>
            {DEAL_BILLING.map((value) => (
              <option key={value} value={value}>
                {DEAL_BILLING_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="deal-status"
            className="text-muted-foreground text-xs"
          >
            Outcome
          </label>
          <select
            id="deal-status"
            name="status"
            defaultValue={filters.status ?? ""}
            className={selectCls}
          >
            <option value="">All</option>
            {DEAL_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {hasFilters && (
          <Link
            href={dealsHref(business, view)}
            className={buttonVariants({ variant: "ghost" })}
          >
            Clear
          </Link>
        )}
      </form>

      {(savedViews.length > 0 || hasFilters) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {savedViews.length > 0 && (
            <span className="text-muted-foreground">Saved views</span>
          )}
          {savedViews.map((saved) => (
            <span
              key={saved.id}
              className="border-border-strong flex items-center rounded-md border"
            >
              <Link
                href={`/deals?${saved.query}`}
                aria-current={saved.query === activeQuery ? "page" : undefined}
                className={
                  "hover:bg-surface-hover rounded-l-md px-2.5 py-1.5 " +
                  (saved.query === activeQuery ? "text-accent font-medium" : "")
                }
              >
                {saved.name}
              </Link>
              <form action={deleteDealViewAction}>
                <input type="hidden" name="id" value={saved.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  aria-label={`Remove saved view ${saved.name}`}
                  className="text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-r-md px-2 py-1.5"
                >
                  ×
                </button>
              </form>
            </span>
          ))}
          {hasFilters && (
            <form
              action={saveDealViewAction}
              className="ml-auto flex items-center gap-2"
            >
              <input type="hidden" name="returnTo" value={returnTo} />
              <label htmlFor="deal-view-name" className="sr-only">
                Saved view name
              </label>
              <Input
                id="deal-view-name"
                name="name"
                placeholder="Name this view"
                maxLength={40}
                className="w-40"
              />
              <Button type="submit" variant="secondary">
                Save view
              </Button>
            </form>
          )}
        </div>
      )}

      {errorMessage && (
        <p role="alert" className="text-danger text-sm">
          {errorMessage}
        </p>
      )}

      {view === "board" ? (
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
          totals={totals}
          cap={BOARD_STAGE_CAP}
          moveAction={moveDeal}
          selectedId={panelDeal?.id ?? null}
        />
      ) : dealTotal === 0 ? (
        <EmptyState
          title={
            hasFilters
              ? "No deals match these filters. Clear them to see the whole pipeline."
              : `No ${BUSINESS_LABEL[business]} deals yet. Add one from a company page.`
          }
          action={
            <Link href="/companies" className={buttonVariants({ size: "sm" })}>
              Go to companies
            </Link>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Deal</Th>
              <Th>Company</Th>
              <Th>Stage</Th>
              <Th className="text-right">Amount</Th>
              <Th>Close date</Th>
              <Th>In stage</Th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <Tr
                key={deal.id}
                href={dealsHref(business, view, deal.id, filters)}
              >
                <Td className="font-medium">{deal.title}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    <Avatar name={deal.companyName} size="sm" />
                    {deal.companyName}
                  </span>
                </Td>
                <Td>
                  <StageBadge stage={DEAL_STAGE_LABEL[deal.stage]} />
                </Td>
                <Td className="num text-right">
                  {formatCents(deal.amountCents)}
                  {deal.billing === "monthly" && "/mo"}
                </Td>
                <Td className="num text-muted-foreground">
                  {deal.closeDate ?? "—"}
                </Td>
                <Td>
                  <AgeChip
                    days={daysSince(deal.stageSince)}
                    stage={deal.stage}
                  />
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {view === "list" && (
        <Pagination
          page={window.page}
          total={dealTotal}
          noun="deals"
          hrefFor={(page) =>
            `${dealsHref(business, view, undefined, filters)}${page > 1 ? `&page=${page}` : ""}`
          }
        />
      )}

      {panelDeal && (
        <DealPanel closeHref={closeHref} title={panelDeal.title}>
          <div className="pr-8">
            <StageBadge stage={DEAL_STAGE_LABEL[panelDeal.stage]} />
            <h2 className="mt-2 text-lg font-semibold">{panelDeal.title}</h2>
            <Link
              href={`/companies/${panelDeal.companyId}`}
              className="text-muted-foreground hover:text-foreground mt-1 inline-flex items-center gap-2 text-sm hover:underline"
            >
              <Avatar name={panelDeal.companyName} size="sm" />
              {panelDeal.companyName}
            </Link>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Amount</dt>
              <dd className="num font-medium">
                {formatCents(panelDeal.amountCents)}
                {panelDeal.billing === "monthly" && "/mo"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Billing</dt>
              <dd>{DEAL_BILLING_LABEL[panelDeal.billing]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Close date</dt>
              <dd className="num">{panelDeal.closeDate ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Added</dt>
              <dd>{formatDate(panelDeal.createdAt)}</dd>
            </div>
            {panelDeal.lostReason && (
              <div className="col-span-2">
                <dt className="text-muted-foreground text-xs">Lost because</dt>
                <dd>{panelDeal.lostReason}</dd>
              </div>
            )}
          </dl>

          <form action={moveDeal} className="flex flex-col gap-2">
            <input type="hidden" name="dealId" value={panelDeal.id} />
            <input type="hidden" name="business" value={business} />
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="openDeal" value="1" />
            <label htmlFor="panel-stage" className="text-sm font-medium">
              Move to stage
            </label>
            <select
              id="panel-stage"
              name="stage"
              defaultValue={panelDeal.stage}
              className="border-border-strong bg-surface-raised h-9 rounded-md border px-2 text-sm"
            >
              {stages.map((s) => (
                <option key={s} value={s}>
                  {DEAL_STAGE_LABEL[s]}
                </option>
              ))}
            </select>
            <label htmlFor="panel-reason" className="text-sm font-medium">
              Reason if lost
            </label>
            <Input
              id="panel-reason"
              name="lostReason"
              defaultValue={panelDeal.lostReason ?? ""}
              placeholder="Required when moving to Lost"
            />
            <Button type="submit" variant="secondary" className="self-start">
              Move deal
            </Button>
          </form>

          <section>
            <h3 className="mb-2 text-sm font-semibold">History</h3>
            <ol className="border-border flex flex-col gap-3 border-l pl-4 text-sm">
              {panelDeal.history.map((change) => (
                <li key={change.id}>
                  <p>
                    {change.fromStage
                      ? `${DEAL_STAGE_LABEL[change.fromStage]} → ${DEAL_STAGE_LABEL[change.toStage]}`
                      : `Started in ${DEAL_STAGE_LABEL[change.toStage]}`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(change.at)}
                  </p>
                </li>
              ))}
              <li>
                <p>Deal added</p>
                <p className="text-muted-foreground text-xs">
                  {formatDate(panelDeal.createdAt)}
                </p>
              </li>
            </ol>
          </section>
        </DealPanel>
      )}
    </div>
  );
}
