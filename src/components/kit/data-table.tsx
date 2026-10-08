"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/cn";

// Wraps server-rendered <thead>/<tbody> markup. Rows with data-href become
// keyboard targets: arrows or j/k move between rows, Enter opens one.
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, button")) return;
    const rows = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("tbody tr[data-href]"),
    );
    const current = rows.indexOf(target.closest("tr") as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      rows[Math.max(0, Math.min(rows.length - 1, to))]?.focus();
    };
    if (event.key === "ArrowDown" || event.key === "j") move(current + 1);
    else if (event.key === "ArrowUp" || event.key === "k")
      move(current < 0 ? 0 : current - 1);
    else if (event.key === "Enter" && current >= 0) {
      const href = rows[current].dataset.href;
      if (href && !target.closest("a")) router.push(href);
    }
  }

  return (
    <div
      onKeyDown={onKeyDown}
      className={cn(
        "border-border max-h-[calc(100dvh-14rem)] overflow-auto rounded-lg border",
        className,
      )}
    >
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
  sort,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  // Pass href to make the column sortable; sort is its current direction.
  sort?: "asc" | "desc" | "none";
  href?: string;
}) {
  const Icon =
    sort === "asc" ? ArrowUp : sort === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <th
      scope="col"
      aria-sort={
        href
          ? sort === "asc"
            ? "ascending"
            : sort === "desc"
              ? "descending"
              : "none"
          : undefined
      }
      className={cn(
        "bg-surface text-muted-foreground border-border sticky top-0 z-10 border-b px-3 py-2 text-xs font-medium",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          className="hover:text-foreground inline-flex items-center gap-1"
        >
          {children}
          <Icon className="size-3.5" aria-hidden="true" />
        </Link>
      ) : (
        children
      )}
    </th>
  );
}

export function Tr({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <tr
      data-href={href}
      tabIndex={href ? 0 : undefined}
      className="border-border hover:bg-surface-hover focus-visible:bg-surface-hover border-b transition-colors last:border-b-0"
    >
      {children}
    </tr>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2", className)}>{children}</td>;
}

export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <p className="text-muted-foreground text-sm">{title}</p>
      {action}
    </div>
  );
}
