export const PAGE_SIZE = 50;

// Reads ?page= from search params; anything unusable is page 1.
export function parsePage(value: string | string[] | undefined) {
  const n = Number(typeof value === "string" ? value : "1");
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

// Clamps a requested page to the last one, so a stale link after rows were
// deleted lands on real rows instead of an empty page.
export function pageWindow(requested: number, total: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, pages);
  return {
    page,
    pages,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    from: total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1,
    to: Math.min(page * PAGE_SIZE, total),
  };
}
