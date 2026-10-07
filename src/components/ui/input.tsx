import { cn } from "@/lib/cn";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-control bg-surface-raised text-foreground placeholder:text-muted-foreground h-9 w-full rounded-md border px-3 text-sm max-md:h-(--tap-target)",
        className,
      )}
      {...props}
    />
  );
}
