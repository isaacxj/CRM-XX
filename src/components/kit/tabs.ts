import type { KeyboardEvent } from "react";

// Arrow, Home and End keys move between the tabs of a tablist, as the ARIA
// tabs pattern expects. Pair with tabIndex={selected ? 0 : -1} on each tab.
export function tabListKeyDown(e: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const tabs = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
  );
  const current = tabs.indexOf(document.activeElement as HTMLElement);
  if (current === -1) return;
  e.preventDefault();
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? tabs.length - 1
        : (current + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  tabs[next].focus();
  tabs[next].click();
}
