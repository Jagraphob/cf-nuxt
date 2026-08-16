import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { categories, transactions } from "../../../lib/db/schema";

const querySchema = dateRangeSchema.extend({
  categoryId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

/** GET /api/family-accounting/transactions?from=&to=&categoryId=&limit=&offset= */
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
  const { from, to, categoryId, limit, offset } = parsed.data;

  const filters = [dateRangeFilter(from, to)];
  if (categoryId) filters.push(eq(transactions.categoryId, categoryId));
  const where = and(...filters.filter(Boolean));

  return await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amountCents: transactions.amountCents,
      note: transactions.note,
      createdBy: transactions.createdBy,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryType: categories.type,
      categoryIcon: categories.icon,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    // Secondary sort by id keeps pagination stable when a whole week shares one date.
    .where(where)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
    .offset(offset);
});
