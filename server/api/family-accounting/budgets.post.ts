import { eq } from "drizzle-orm";
import { z } from "zod";
import { budgets, categories } from "../../../lib/db/schema";
import { periodStart, previousDay } from "../../../lib/periods";

/**
 * POST /api/family-accounting/budgets
 *
 * Sets (or changes) the budget for a category. Accepts one object or an array,
 * so several budgets can be set in a single save from the Add page.
 *
 * Changing an amount does not edit the existing row: it closes the current
 * version and opens a new one, so periods already spent keep the figure they
 * were judged against. Both boundaries snap to a period start, which is what
 * prevents a period being counted twice when a budget changes mid-week.
 */
const bodySchema = z.union([budgetInputSchema, z.array(budgetInputSchema).min(1).max(30)]);

export default defineEventHandler(async (event) => {
  const user = await requireFamilyUser(event);
  const db = useDb(event);

  const parsed = bodySchema.safeParse(await readBody(event));
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid budget",
      data: parsed.error.issues,
    });
  }
  const inputs = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  const today = new Date().toISOString().slice(0, 10);

  const created = [];
  for (const input of inputs) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);
    if (!category) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown category: ${input.categoryId}`,
      });
    }
    // Budgeting income makes no sense — you don't cap what comes in.
    if (category.type === "income") {
      throw createError({
        statusCode: 400,
        statusMessage: `"${category.name}" is an income category and can't be budgeted`,
      });
    }

    const effectiveFrom = periodStart(input.startDate ?? today, input.period);

    // Close any version still running at that point. Versions starting on or
    // after the new one are replaced outright — re-setting a budget twice in the
    // same period should leave one version, not a zero-length sliver.
    const existing = await db
      .select()
      .from(budgets)
      .where(eq(budgets.categoryId, input.categoryId));

    for (const version of existing) {
      if (version.startDate >= effectiveFrom) {
        await db.delete(budgets).where(eq(budgets.id, version.id));
      } else if (version.endDate === null || version.endDate >= effectiveFrom) {
        await db
          .update(budgets)
          .set({ endDate: previousDay(effectiveFrom), updatedAt: now() })
          .where(eq(budgets.id, version.id));
      }
    }

    const row = {
      id: newId(),
      categoryId: input.categoryId,
      period: input.period,
      amountCents: input.amountCents,
      startDate: effectiveFrom,
      endDate: null,
      createdBy: user.email,
      createdAt: now(),
      updatedAt: now(),
    };
    await db.insert(budgets).values(row);
    created.push(row);
  }

  return created;
});
