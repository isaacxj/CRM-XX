import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-border bg-surface-raised rounded-lg border p-4",
        className,
      )}
      {...props}
    />
  );
}
