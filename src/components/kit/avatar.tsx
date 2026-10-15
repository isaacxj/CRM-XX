import { cn } from "@/lib/cn";

export function initialsOf(name: string) {
  const parts = name
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-accent-soft text-accent inline-flex shrink-0 items-center justify-center rounded-md font-medium",
        size === "sm" ? "size-6 text-xs" : "size-8 text-sm",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
