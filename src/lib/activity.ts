import type { ActivityType } from "@/server/db/schema";

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  note: "Note",
  email_sent: "Email sent",
  email_received: "Email received",
  call: "Call",
  meeting: "Meeting",
};

export const ACTIVITY_TYPE_ICON: Record<ActivityType, string> = {
  note: "📝",
  email_sent: "📤",
  email_received: "📥",
  call: "📞",
  meeting: "📅",
};

function toDate(value: string) {
  // D1 stores UTC text without a zone marker.
  return new Date(`${value.replace(" ", "T")}Z`);
}

// "Tue, Sep 29, 2:30 PM" or "Tue, Sep 29, 2:30 – 3:15 PM" when an end is set.
export function formatMeetingTime(startsAt: string, endsAt?: string | null) {
  const start = toDate(startsAt);
  const day = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endsAt) return `${day}, ${time(start)}`;
  const end = toDate(endsAt);
  return end.toDateString() === start.toDateString()
    ? `${day}, ${time(start)} – ${time(end)}`
    : `${day}, ${time(start)} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${time(end)}`;
}

// The name part of an email address, for compact "owner" labels.
export function ownerLabel(email: string | null | undefined) {
  return email ? email.split("@")[0] : null;
}
