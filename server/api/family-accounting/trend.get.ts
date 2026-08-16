import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { categories, transactions } from "../../../lib/db/schema";

const querySchema = dateRangeSchema.extend({
  categoryId: z.string().min(1).optional(),
});

/**
 * GET /api/family-accounting/trend?from=&to=&categoryId=
 *
 * Monthly buckets of income / expense / transfer. Months are grouped with
 * substr(date, 1, 7) — free because dates are stored as ISO text.
 * Optionally scoped to one category, which powers the drill-down view.
 */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const parsed = querySchema.safeParse(getQuery(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid query",
      data: parsed.error.issues,
    });
  }
  const { from, to, categoryId } = parsed.data;

  const month = sql<string>`substr(${transactions.date}, 1, 7)`;
  const filters = [dateRangeFilter(from, to)];
  if (categoryId) filters.push(eq(transactions.categoryId, categoryId));

  const rows = await db
    .select({
      month,
      type: categories.type,
      totalCents: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(and(...filters.filter(Boolean)))
    .groupBy(month, categories.type)
    .orderBy(asc(month));

  // Pivot the (month, type) rows into one object per month so the chart can map
  // straight over them without hunting for missing types.
  const byMonth = new Map<
    string,
    { month: string; income: number; expense: number; transfer: number }
  >();
  for (const row of rows) {
    const key = row.month;
    if (!byMonth.has(key)) {
      byMonth.set(key, { month: key, income: 0, expense: 0, transfer: 0 });
    }
    byMonth.get(key)![row.type] = Number(row.totalCents);
  }

  return [...byMonth.values()].map((m) => ({
    ...m,
    net: m.income - m.expense - m.transfer,
  }));
});
