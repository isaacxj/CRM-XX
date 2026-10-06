import { asc, eq } from "drizzle-orm";

import { getDb } from "./index";
import { savedViews, type SavedViewScope } from "./schema";

export async function listSavedViews(scope: SavedViewScope) {
  const db = getDb();
  return db
    .select()
    .from(savedViews)
    .where(eq(savedViews.scope, scope))
    .orderBy(asc(savedViews.name));
}

export async function createSavedView(input: {
  scope: SavedViewScope;
  name: string;
  query: string;
}) {
  const db = getDb();
  const [view] = await db.insert(savedViews).values(input).returning();
  return view;
}

export async function deleteSavedView(id: number) {
  const db = getDb();
  await db.delete(savedViews).where(eq(savedViews.id, id));
}
