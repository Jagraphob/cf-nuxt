import { inArray } from "drizzle-orm";
import { z } from "zod";
import { categories, transactions } from "../../../lib/db/schema";

/**
 * POST /api/family-accounting/transactions
 *
 * Accepts a single transaction or an array of them. The array form is what makes
 * batch entry work: a whole week of spending goes in as one request, all or nothing.
 */
const bodySchema = z.union([
  transactionInputSchema,
  z.array(transactionInputSchema).min(1).max(50),
]);

export default defineEventHandler(async (event) => {
  const user = await requireFamilyUser(event);
  const db = useDb(event);

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid transaction",
      data: parsed.error.issues,
    });
  }
  const inputs = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

  // Verify every referenced category up front — D1 does not enforce foreign keys
  // by default, so a bad id would otherwise insert happily and break the joins.
  const ids = [...new Set(inputs.map((i) => i.categoryId))];
  const found = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, ids));
  if (found.length !== ids.length) {
    const known = new Set(found.map((c) => c.id));
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown category: ${ids.filter((id) => !known.has(id)).join(", ")}`,
    });
  }

  const timestamp = now();
  const rows = inputs.map((input) => ({
    id: newId(),
    date: input.date,
    categoryId: input.categoryId,
    amountCents: input.amountCents,
    note: input.note?.trim() || null,
    createdBy: user.email,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  await db.insert(transactions).values(rows);
  return rows;
});
