import { eq } from "drizzle-orm";
import { categories, transactions } from "../../../../lib/db/schema";

/** PATCH /api/family-accounting/transactions/:id */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const id = getRouterParam(event, "id")!;
  const parsed = transactionPatchSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid transaction",
      data: parsed.error.issues,
    });
  }
  const input = parsed.data;

  const [existing] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Transaction not found" });
  }

  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);
    if (!category) {
      throw createError({ statusCode: 400, statusMessage: "Unknown category" });
    }
  }

  const patch: Partial<typeof transactions.$inferInsert> = { updatedAt: now() };
  if (input.date !== undefined) patch.date = input.date;
  if (input.categoryId !== undefined) patch.categoryId = input.categoryId;
  if (input.amountCents !== undefined) patch.amountCents = input.amountCents;
  if (input.note !== undefined) patch.note = input.note?.trim() || null;

  await db.update(transactions).set(patch).where(eq(transactions.id, id));
  return { ...existing, ...patch };
});
