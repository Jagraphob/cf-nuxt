import { eq } from "drizzle-orm";
import { categories } from "../../../../lib/db/schema";

/** PATCH /api/family-accounting/categories/:id — rename, re-icon, reorder, archive. */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const id = getRouterParam(event, "id")!;
  const parsed = categoryPatchSchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid category",
      data: parsed.error.issues,
    });
  }
  const { name, icon, sortOrder, archived } = parsed.data;

  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: "Category not found" });
  }

  const patch: Partial<typeof categories.$inferInsert> = {};
  if (name !== undefined) patch.name = name;
  if (icon !== undefined) patch.icon = icon;
  if (sortOrder !== undefined) patch.sortOrder = sortOrder;
  if (archived !== undefined) patch.archivedAt = archived ? now() : null;

  if (Object.keys(patch).length === 0) return existing;

  // The category's `type` is deliberately not patchable: flipping an expense
  // category to income would silently reverse the sign of all its history.
  try {
    await db.update(categories).set(patch).where(eq(categories.id, id));
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw createError({
        statusCode: 409,
        statusMessage: `A ${existing.type} category named "${name}" already exists`,
      });
    }
    throw error;
  }

  return { ...existing, ...patch };
});
