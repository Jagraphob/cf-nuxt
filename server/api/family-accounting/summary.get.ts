import { desc, eq, sql } from "drizzle-orm";
import { categories, transactions } from "../../../lib/db/schema";

/**
 * GET /api/family-accounting/summary?from=&to=
 *
 * Totals for a date range, plus a per-category breakdown. Transfers are reported
 * alongside expenses but kept as their own type so the UI can show "where the
 * money went" without a single savings transfer drowning out real spending.
 */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const { from, to } = getDateRange(event);

  const byCategory = await db
    .select({
      categoryId: categories.id,
      name: categories.name,
      type: categories.type,
      icon: categories.icon,
      totalCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(dateRangeFilter(from, to))
    .groupBy(categories.id)
    .orderBy(desc(sql`sum(${transactions.amountCents})`));

  const totals = await totalsByType(db, from, to);

  return {
    from: from ?? null,
    to: to ?? null,
    totals: {
      ...totals,
      /** What actually stayed in the account over the period. */
      net: totals.income - totals.expense - totals.transfer,
    },
    byCategory: byCategory.map((row) => ({
      ...row,
      totalCents: Number(row.totalCents),
      count: Number(row.count),
    })),
  };
});
