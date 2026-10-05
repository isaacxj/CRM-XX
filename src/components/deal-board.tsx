"use client";

import { tabListKeyDown } from "@/components/kit/tabs";
import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/kit/avatar";
import { AgeChip, formatCents } from "@/components/deal-shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type BoardDeal = {
  id: number;
  title: string;
  stage: string;
  amountCents: number;
  billingLabel: string;
  closeDate: string | null;
  lostReason: string | null;
  companyId: number;
  companyName: string;
  daysInStage: number;
};

export type BoardStage = { value: string; label: string };

export function DealBoard({
  business,
  stages,
  deals,
  totals,
  cap,
  moveAction,
  selectedId,
}: {
  business: string;
  stages: BoardStage[];
  deals: BoardDeal[];
  // Every deal's count and amount per stage, since a column may show only
  // its newest `cap` cards.
  totals: Record<string, { count: number; cents: number }>;
  cap: number;
  moveAction: (formData: FormData) => Promise<void>;
  selectedId: number | null;
}) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [lostDeal, setLostDeal] = useState<BoardDeal | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Phones show one stage at a time; md and up show every column.
  const [activeStage, setActiveStage] = useState(stages[0]?.value ?? "");

  async function submitMove(dealId: number, stage: string, reason = "") {
    const data = new FormData();
    data.set("dealId", String(dealId));
    data.set("stage", stage);
    data.set("lostReason", reason);
    data.set("business", business);
    setError(null);
    try {
      await moveAction(data);
    } catch {
      setError("Couldn't move that deal. Reload the page and try again.");
    }
  }

  function onDrop(stage: string) {
    const deal = deals.find((d) => d.id === dragId);
    setDragId(null);
    setOverStage(null);
    if (!deal || deal.stage === stage) return;
    if (stage === "lost") {
      setLostDeal(deal);
      return;
    }
    void submitMove(deal.id, stage);
  }

  const dragging = dragId !== null;

  return (
    <>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <div
        role="tablist"
        aria-label="Stage"
        onKeyDown={tabListKeyDown}
        className="-mx-6 flex gap-1 overflow-x-auto px-6 pb-1 md:hidden"
      >
        {stages.map((stage) => {
          const count = totals[stage.value]?.count ?? 0;
          const active = stage.value === activeStage;
          return (
            <button
              key={stage.value}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setActiveStage(stage.value)}
              className={cn(
                "inline-flex h-(--tap-target) shrink-0 items-center gap-1.5 rounded-md px-3 text-sm",
                active
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-muted-foreground hover:bg-surface-hover",
              )}
            >
              {stage.label}
              <span className="num text-xs">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="flex min-h-0 flex-1 gap-3 md:-mx-8 md:overflow-x-auto md:px-8 md:pb-2">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.value);
          const total = totals[stage.value]?.cents ?? 0;
          const hidden = (totals[stage.value]?.count ?? 0) - stageDeals.length;
          const isOver = overStage === stage.value && dragging;
          return (
            <section
              key={stage.value}
              aria-label={stage.label}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.value);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setOverStage(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(stage.value);
              }}
              className={cn(
                "bg-surface min-h-48 w-full flex-col rounded-lg border transition-colors md:flex md:max-h-[calc(100dvh-16rem)] md:w-64 md:shrink-0",
                stage.value === activeStage ? "flex" : "hidden",
                isOver
                  ? "border-accent bg-accent-soft"
                  : dragging
                    ? "border-border-strong border-dashed"
                    : "border-border",
              )}
            >
              <header className="border-border flex items-center justify-between gap-2 border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">{stage.label}</h2>
                  <Badge className="num">
                    {totals[stage.value]?.count ?? 0}
                  </Badge>
                </div>
                <span className="num text-muted-foreground text-xs">
                  {formatCents(total)}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                {stageDeals.length === 0 && (
                  <p className="text-muted-foreground px-1 py-3 text-xs">
                    {dragging ? "Drop here" : "No deals in this stage."}
                  </p>
                )}
                {stageDeals.map((deal) => (
                  <article
                    key={deal.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(deal.id));
                      setDragId(deal.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                    className={cn(
                      "bg-surface-raised hover:border-border-strong cursor-grab rounded-md border p-2.5 text-sm transition-colors active:cursor-grabbing",
                      deal.id === selectedId
                        ? "border-accent"
                        : "border-border",
                      dragId === deal.id && "opacity-40",
                    )}
                  >
                    <Link
                      href={`/deals?business=${business}&deal=${deal.id}`}
                      className="line-clamp-2 font-medium hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
                      <Avatar name={deal.companyName} size="sm" />
                      <span className="truncate">{deal.companyName}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="num font-medium">
                        {formatCents(deal.amountCents)}
                        {deal.billingLabel === "Monthly" && (
                          <span className="text-muted-foreground font-normal">
                            /mo
                          </span>
                        )}
                      </span>
                      <AgeChip days={deal.daysInStage} stage={deal.stage} />
                    </div>
                    {deal.closeDate && (
                      <p className="num text-muted-foreground mt-1 text-xs">
                        Closes {deal.closeDate}
                      </p>
                    )}
                  </article>
                ))}
                {hidden > 0 && (
                  <p className="text-muted-foreground px-1 py-2 text-xs">
                    Showing the newest {cap} of {totals[stage.value]?.count}.{" "}
                    Switch to List to see all {hidden + stageDeals.length}.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {lostDeal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
          <form
            role="dialog"
            aria-label="Mark deal as lost"
            onSubmit={(e) => {
              e.preventDefault();
              const reason = String(
                new FormData(e.currentTarget).get("reason") ?? "",
              ).trim();
              if (!reason) return;
              const deal = lostDeal;
              setLostDeal(null);
              void submitMove(deal.id, "lost", reason);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setLostDeal(null);
            }}
            className="bg-surface-raised border-border-strong shadow-overlay flex w-full max-w-sm flex-col gap-3 rounded-xl border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-md:max-w-none max-md:rounded-b-none"
          >
            <h2 className="font-semibold">Mark “{lostDeal.title}” as lost</h2>
            <label className="flex flex-col gap-1 text-sm">
              Why was it lost?
              <input
                name="reason"
                required
                autoFocus
                className="border-border-strong bg-background h-9 rounded-md border px-3 max-md:h-(--tap-target)"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLostDeal(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Mark as lost</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
