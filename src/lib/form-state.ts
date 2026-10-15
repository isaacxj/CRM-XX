import type { ZodError } from "zod";

// Result of a server action used with FormSheet. Success actions redirect, so
// a returned state always means "show these errors".
export type FormState = {
  errors: Record<string, string>;
  message?: string;
} | null;

export function zodErrors(error: ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return { errors, message: "Fix the highlighted fields and try again." };
}
