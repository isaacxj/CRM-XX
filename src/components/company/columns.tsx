"use client";

import { tabListKeyDown } from "@/components/kit/tabs";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

type Tab = "overview" | "activity";

const TABS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
];

// Two columns on desktop; on phones the same content splits into Overview and
// Activity tabs so each screen is one short scroll.
export function CompanyColumns({
  overview,
  activity,
}: {
  overview: React.ReactNode;
  activity: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  // The header's quick actions link to #composer and #followups; open the tab
  // that holds the target so the jump works on phones too.
  useEffect(() => {
    function syncWithHash() {
      if (window.location.hash === "#composer") setTab("activity");
      if (window.location.hash === "#followups") setTab("overview");
    }
    syncWithHash();
    window.addEventListener("hashchange", syncWithHash);
    return () => window.removeEventListener("hashchange", syncWithHash);
  }, []);

  return (
    <>
      <div
        role="tablist"
        aria-label="Company sections"
        onKeyDown={tabListKeyDown}
        className="border-border grid grid-cols-2 border-b lg:hidden"
      >
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`company-tab-${value}`}
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            aria-controls={`company-panel-${value}`}
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px h-(--tap-target) border-b-2 text-sm font-medium",
              tab === value
                ? "border-accent text-foreground"
                : "text-muted-foreground border-transparent",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div
          role="tabpanel"
          id="company-panel-overview"
          aria-labelledby="company-tab-overview"
          className={cn(
            "min-w-0",
            tab === "overview" ? "block" : "hidden lg:block",
          )}
        >
          {overview}
        </div>
        <div
          role="tabpanel"
          id="company-panel-activity"
          aria-labelledby="company-tab-activity"
          className={cn(
            "min-w-0",
            tab === "activity" ? "block" : "hidden lg:block",
          )}
        >
          {activity}
        </div>
      </div>
    </>
  );
}
