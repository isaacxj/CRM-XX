// Buckets for the Closing page, by how soon a deal's close date falls.
export const CLOSING_GROUPS = [
  { key: "overdue", label: "Past its close date" },
  { key: "week", label: "Next 7 days" },
  { key: "month", label: "Within 30 days" },
  { key: "later", label: "Later" },
  { key: "none", label: "No close date" },
] as const;

export type ClosingGroupKey = (typeof CLOSING_GROUPS)[number]["key"];

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function closingGroup(
  closeDate: string | null,
  today: string,
): ClosingGroupKey {
  if (!closeDate) return "none";
  if (closeDate < today) return "overdue";
  if (closeDate <= addDays(today, 7)) return "week";
  if (closeDate <= addDays(today, 30)) return "month";
  return "later";
}

export function daysUntil(closeDate: string, today: string) {
  return Math.round(
    (Date.parse(`${closeDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
      86_400_000,
  );
}
