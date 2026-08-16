import { eq, sql } from "drizzle-orm";
import { categories, transactions } from "../../../../lib/db/schema";

/**
 * DELETE /api/family-accounting/categories/:id
 *
 * Only categories with no history are actually deleted. One that has been used
 * returns 409 with its transaction count, so the UI can offer archiving instead
 * — deleting it would orphan every entry filed under it.
 */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const id = getRouterParam(event, "id")!;

  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Category not found" });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, id));

  if (Number(count) > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: "Category is in use",
      data: { transactionCount: Number(count), canArchive: true },
    });
  }

  await db.delete(categories).where(eq(categories.id, id));
  return { deleted: true };
});
