import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { getDb } from "./index";
import { companies, deals, tasks, type Business } from "./schema";

export async function getHomeCounts(business: Business) {
  const db = getDb();

  const companyRows = await db
    .select()
    .from(companies)
    .where(and(eq(companies.business, business), isNull(companies.archivedAt)));

  const companyIds = companyRows.map((c) => c.id);

  if (companyIds.length === 0) {
    return {
      companyCount: 0,
      clientCount: 0,
      prospectCount: 0,
      openDealCount: 0,
      pipelineCents: 0,
      openTaskCount: 0,
    };
  }

  const [openDeals, openTasks] = await Promise.all([
    db
      .select()
      .from(deals)
      .where(
        and(
          inArray(deals.companyId, companyIds),
          ne(deals.stage, "won"),
          ne(deals.stage, "lost"),
        ),
      ),
    db
      .select()
      .from(tasks)
      .where(and(inArray(tasks.companyId, companyIds), isNull(tasks.doneAt))),
  ]);

  return {
    companyCount: companyRows.length,
    clientCount: companyRows.filter((c) => c.status === "client").length,
    prospectCount: companyRows.filter((c) => c.status === "prospect").length,
    openDealCount: openDeals.length,
    pipelineCents: openDeals.reduce((sum, d) => sum + d.amountCents, 0),
    openTaskCount: openTasks.length,
  };
}
