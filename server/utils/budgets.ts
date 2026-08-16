import { and, asc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { budgets, categories, transactions } from "../../lib/db/schema";
import {
  periodEnd,
  periodStart,
  periodsBetween,
  type BudgetPeriod,
} from "../../lib/periods";

export const budgetPeriodSchema = z.enum(["weekly", "monthly"]);

export const budgetInputSchema = z.object({
  categoryId: z.string().min(1),
  period: budgetPeriodSchema,
  amountCents: z.number().int().positive(),
  /** Defaults to today; always snapped back to its period start before saving. */
  startDate: isoDateSchema.optional(),
});

type Db = ReturnType<typeof useDb>;

/** Every budget version for a category, oldest first. */
export async function budgetVersions(db: Db, categoryId?: string) {
  return await db
    .select()
    .from(budgets)
    .where(categoryId ? eq(budgets.categoryId, categoryId) : undefined)
    .orderBy(asc(budgets.categoryId), asc(budgets.startDate));
}

/**
 * Cumulative budget position for one category as at `asOf`.
 *
 * She chose a running kitty: both underspend and overspend carry forward. That
 * makes the remaining figure cumulative rather than per-period, which is
 * actually simpler to compute — total ever budgeted minus total ever spent, with
 * no need to walk period by period:
 *
 *   remaining = Σ(periods elapsed per version × that version's amount)
 *             − Σ(spend in the category since the budget began)
 *
 * The current period counts in full: a week's allowance is available on Monday,
 * not accrued daily.
 */
export function computeBudgetTotals(
  versions: (typeof budgets.$inferSelect)[],
  asOf: string,
) {
  if (!versions.length) return null;

  const current =
    versions.find(
      (v) => v.startDate <= asOf && (v.endDate === null || v.endDate >= asOf),
    ) ?? versions[versions.length - 1]!;

  let budgetedCents = 0;
  for (const version of versions) {
    // A version stops accruing at whichever comes first: its end, or `asOf`.
    const effectiveEnd =
      version.endDate && version.endDate < asOf ? version.endDate : asOf;
    if (effectiveEnd < version.startDate) continue;
    budgetedCents +=
      periodsBetween(version.startDate, effectiveEnd, version.period) *
      version.amountCents;
  }

  return {
    current,
    budgetedCents,
    /** First day any budget applied — the start of the spend window. */
    since: versions[0]!.startDate,
  };
}

/**
 * Budget progress per category as at `asOf`, for categories that have a budget.
 * Spend is summed over the whole current period so entries dated later in the
 * week still count against it.
 */
export async function budgetProgress(db: Db, asOf: string) {
  const all = await budgetVersions(db);
  if (!all.length) return [];

  const byCategory = new Map<string, (typeof budgets.$inferSelect)[]>();
  for (const version of all) {
    if (!byCategory.has(version.categoryId)) byCategory.set(version.categoryId, []);
    byCategory.get(version.categoryId)!.push(version);
  }

  const categoryRows = await db.select().from(categories);
  const categoryById = new Map(categoryRows.map((c) => [c.id, c]));

  const results = [];
  for (const [categoryId, versions] of byCategory) {
    const totals = computeBudgetTotals(versions, asOf);
    const category = categoryById.get(categoryId);
    if (!totals || !category) continue;

    const { current, budgetedCents, since } = totals;
    const currentStart = periodStart(asOf, current.period);
    const currentEnd = periodEnd(asOf, current.period);

    // One query per category is fine here: this list is the handful of
    // categories she has actually budgeted, not the whole ledger.
    const [spendTotals] = await db
      .select({
        allTime: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
        thisPeriod: sql<number>`coalesce(sum(case when ${transactions.date} >= ${currentStart} then ${transactions.amountCents} else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.categoryId, categoryId),
          gte(transactions.date, since),
          lte(transactions.date, currentEnd),
        ),
      );

    const spentSinceCents = Number(spendTotals?.allTime ?? 0);
    const spentThisPeriodCents = Number(spendTotals?.thisPeriod ?? 0);
    const remainingCents = budgetedCents - spentSinceCents;

    results.push({
      categoryId,
      name: category.name,
      icon: category.icon,
      type: category.type,
      period: current.period,
      /** This period's allowance on its own, before any carry. */
      amountCents: current.amountCents,
      spentThisPeriodCents,
      /** What was carried in from earlier periods: negative means overspent. */
      carriedInCents: remainingCents - (current.amountCents - spentThisPeriodCents),
      /** Actually available now, carry included. */
      remainingCents,
      budgetedCents,
      spentSinceCents,
      since,
      periodStart: currentStart,
      periodEnd: currentEnd,
    });
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/** The version in force on `date`, if any. */
export async function activeBudget(db: Db, categoryId: string, date: string) {
  const [row] = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.categoryId, categoryId),
        lte(budgets.startDate, date),
        or(isNull(budgets.endDate), gte(budgets.endDate, date)),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type { BudgetPeriod };
