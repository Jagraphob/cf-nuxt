import { asc } from "drizzle-orm";
import { categories } from "../../../lib/db/schema";

/** GET /api/family-accounting/categories?includeArchived=1 */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const { includeArchived } = getQuery(event);

  return await db
    .select()
    .from(categories)
    .where(includeArchived ? undefined : activeCategoriesFilter())
    .orderBy(asc(categories.sortOrder), asc(categories.name));
});
