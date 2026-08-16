import { z } from "zod";

const querySchema = z.object({
  asOf: isoDateSchema.optional(),
  /** Include the full version history rather than just current progress. */
  history: z.coerce.boolean().optional(),
});

/** GET /api/family-accounting/budgets?asOf=&history= */
export default defineEventHandler(async (event) => {
  await requireFamilyUser(event);
  const db = useDb(event);

  const parsed = querySchema.safeParse(getQuery(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid query" });
  }

  // `asOf` defaults to the server's today. The client passes its own local date
  // so the "current week" matches the user's calendar, not UTC's.
  const asOf = parsed.data.asOf ?? new Date().toISOString().slice(0, 10);

  const progress = await budgetProgress(db, asOf);
  if (!parsed.data.history) return progress;

  return { asOf, progress, versions: await budgetVersions(db) };
});
