"use client";

import Link from "next/link";
import { useState } from "react";

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

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function DealBoard({
  business,
  stages,
  deals,
  moveAction,
}: {
  business: string;
  stages: BoardStage[];
  deals: BoardDeal[];
  moveAction: (formData: FormData) => Promise<void>;
}) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [lostDeal, setLostDeal] = useState<BoardDeal | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage.value);
          const total = stageDeals.reduce((sum, d) => sum + d.amountCents, 0);
          const isOver = overStage === stage.value && dragId !== null;
          return (
            <div
              key={stage.value}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.value);
              }}
              onDragLeave={() => setOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(stage.value);
              }}
              className={`flex w-64 shrink-0 flex-col gap-3 rounded-lg border p-3 ${
                isOver
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                  : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div>
                <h2 className="text-sm font-semibold">{stage.label}</h2>
                <p className="text-xs text-zinc-500">
                  {stageDeals.length} · {formatCents(total)}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {stageDeals.length === 0 && (
                  <p className="text-xs text-zinc-400">Drop a deal here</p>
                )}
                {stageDeals.map((deal) => (
                  <div
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
                    className={`cursor-grab rounded border border-zinc-100 p-3 text-sm active:cursor-grabbing dark:border-zinc-900 ${
                      dragId === deal.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link
                      href={`/companies/${deal.companyId}`}
                      className="font-medium hover:underline"
                    >
                      {deal.title}
                    </Link>
                    <p className="text-zinc-500">{deal.companyName}</p>
                    <p className="mt-1 text-zinc-500">
                      {formatCents(deal.amountCents)} · {deal.billingLabel}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {deal.closeDate ? `Closes ${deal.closeDate} · ` : ""}
                      {deal.daysInStage === 0
                        ? "In stage today"
                        : `${deal.daysInStage} ${deal.daysInStage === 1 ? "day" : "days"} in stage`}
                    </p>
                    <form
                      action={moveAction}
                      className="mt-2 flex flex-col gap-2"
                    >
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="business" value={business} />
                      <select
                        name="stage"
                        defaultValue={deal.stage}
                        aria-label={`Stage for ${deal.title}`}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        {stages.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        name="lostReason"
                        type="text"
                        defaultValue={deal.lostReason ?? ""}
                        placeholder="Reason if Lost"
                        aria-label={`Lost reason for ${deal.title}`}
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

      {lostDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
            className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-4 shadow-lg dark:bg-zinc-900"
          >
            <h2 className="font-semibold">Mark “{lostDeal.title}” as lost</h2>
            <label className="flex flex-col gap-1 text-sm">
              Why was it lost?
              <input
                name="reason"
                required
                autoFocus
                className="rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLostDeal(null)}
                className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Mark as lost
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
