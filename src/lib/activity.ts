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
