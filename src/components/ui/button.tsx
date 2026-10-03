import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground hover:opacity-90",
        secondary:
          "border border-border-strong bg-surface-raised text-foreground hover:bg-surface-hover",
        ghost:
          "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        danger: "bg-danger text-background hover:opacity-90",
      },
      size: {
        sm: "h-8 px-2.5",
        md: "h-9 px-3.5",
        lg: "h-11 px-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
