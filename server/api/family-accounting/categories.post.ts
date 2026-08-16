import { desc } from "drizzle-orm";
import { categories } from "../../../lib/db/schema";

/** POST /api/family-accounting/categories */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const parsed = categoryInputSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid category",
      data: parsed.error.issues,
    });
  }
  const input = parsed.data;

  // New categories land at the end of the list unless told otherwise.
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const [last] = await db
      .select({ sortOrder: categories.sortOrder })
      .from(categories)
      .orderBy(desc(categories.sortOrder))
      .limit(1);
    sortOrder = (last?.sortOrder ?? -1) + 1;
  }

  const row = {
    id: newId(),
    name: input.name,
    type: input.type,
    icon: input.icon ?? null,
    sortOrder,
    archivedAt: null,
    createdAt: now(),
  };

  try {
    await db.insert(categories).values(row);
  } catch (error) {
    // The (name, type) unique index is the only constraint that can trip here.
    if (String(error).includes("UNIQUE")) {
      throw createError({
        statusCode: 409,
        statusMessage: `A ${input.type} category named "${input.name}" already exists`,
      });
    }
    throw error;
  }

  return row;
});
