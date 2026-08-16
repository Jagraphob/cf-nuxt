import { eq } from "drizzle-orm";
import { categories, transactions } from "../../../../lib/db/schema";

/** GET /api/family-accounting/transactions/:id */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const id = getRouterParam(event, "id")!;

  const [row] = await db
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
    .where(eq(transactions.id, id))
    .limit(1);

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: "Transaction not found" });
  }
  return row;
});
