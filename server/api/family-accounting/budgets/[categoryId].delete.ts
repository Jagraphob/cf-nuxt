import { eq } from "drizzle-orm";
import { budgets } from "../../../../lib/db/schema";
import { periodStart, previousDay } from "../../../../lib/periods";

/**
 * DELETE /api/family-accounting/budgets/:categoryId
 *
 * Stops budgeting a category. By default this closes the current version at the
 * end of the last completed period, keeping the history so past weeks still show
 * what they were judged against. `?purge=1` removes every version instead, for
 * when a budget was set by mistake.
 */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const categoryId = getRouterParam(event, "categoryId")!;
  const { purge } = getQuery(event);

  const versions = await db
    .select()
    .from(budgets)
    .where(eq(budgets.categoryId, categoryId));
  if (!versions.length) {
    throw createError({ statusCode: 404, statusMessage: "No budget for that category" });
  }

  if (purge) {
    await db.delete(budgets).where(eq(budgets.categoryId, categoryId));
    return { purged: versions.length };
  }

  const today = new Date().toISOString().slice(0, 10);
  let stopped = 0;
  for (const version of versions) {
    if (version.endDate !== null) continue;
    const cutoff = previousDay(periodStart(today, version.period));
    if (cutoff < version.startDate) {
      // It never covered a completed period, so there is no history worth keeping.
      await db.delete(budgets).where(eq(budgets.id, version.id));
    } else {
      await db
        .update(budgets)
        .set({ endDate: cutoff, updatedAt: now() })
        .where(eq(budgets.id, version.id));
    }
    stopped++;
  }

  return { stopped };
});
