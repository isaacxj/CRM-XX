// Buckets for the Stalled page, by how long a deal has sat in its stage.
export const STALLED_GROUPS = [
  { key: "sixty", label: "60 days or more", min: 60 },
  { key: "thirty", label: "30 to 59 days", min: 30 },
  { key: "fourteen", label: "14 to 29 days", min: 14 },
  { key: "fresh", label: "Under 14 days", min: 0 },
] as const;

export type StalledGroupKey = (typeof STALLED_GROUPS)[number]["key"];

export function stalledGroup(days: number): StalledGroupKey {
  return STALLED_GROUPS.find((group) => days >= group.min)!.key;
}

export function daysSince(timestamp: string, now = Date.now()) {
  // SQLite timestamps are UTC "YYYY-MM-DD HH:MM:SS".
  const then = new Date(`${timestamp.replace(" ", "T")}Z`).getTime();
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}
