import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { pageWindow } from "@/lib/pagination";

// Previous and next links under a long list. `hrefFor` builds the URL for a
// page number so each page keeps its own filters.
export function Pagination({
  page,
  total,
  hrefFor,
  noun = "rows",
}: {
  page: number;
  total: number;
  hrefFor: (page: number) => string;
  noun?: string;
}) {
  const w = pageWindow(page, total);
  if (w.pages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted-foreground num">
        {w.from}–{w.to} of {total} {noun}
      </p>
      <div className="flex gap-2">
        {w.page > 1 ? (
          <Link
            href={hrefFor(w.page - 1)}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Previous
          </Link>
        ) : null}
        {w.page < w.pages ? (
          <Link
            href={hrefFor(w.page + 1)}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
