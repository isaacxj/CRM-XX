import { toCsv } from "@/lib/csv";
import {
  EXPORT_DATASETS,
  exportDataset,
  type ExportDataset,
} from "@/server/db/export";
import { BUSINESSES, type Business } from "@/server/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await params;
  if (!(EXPORT_DATASETS as readonly string[]).includes(dataset)) {
    return new Response("Unknown export", { status: 404 });
  }

  const requested = new URL(request.url).searchParams.get("business") ?? "";
  const business = (BUSINESSES as readonly string[]).includes(requested)
    ? (requested as Business)
    : undefined;

  const { header, rows } = await exportDataset(
    dataset as ExportDataset,
    business,
  );
  const date = new Date().toISOString().slice(0, 10);

  return new Response(toCsv([header, ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="crm-${business ?? "all"}-${dataset}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
