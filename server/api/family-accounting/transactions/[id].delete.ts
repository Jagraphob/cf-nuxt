import { eq } from "drizzle-orm";
import { transactions } from "../../../../lib/db/schema";

/** DELETE /api/family-accounting/transactions/:id */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const id = getRouterParam(event, "id")!;

  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Transaction not found" });
  }

  await db.delete(transactions).where(eq(transactions.id, id));
  return { deleted: true };
});
