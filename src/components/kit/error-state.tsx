import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// Full-page state for 404s and unexpected errors: says what happened and
// offers a way out.
export function ErrorState({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {actions ?? (
            <Link href="/" className={cn(buttonVariants({}))}>
              Go to Today
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
