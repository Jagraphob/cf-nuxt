import { z } from "zod";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { categories, settings, transactions, type CategoryType } from "../../lib/db/schema";
import type { H3Event } from "h3";

/** ISO 'YYYY-MM-DD' — the only date format stored anywhere in this app. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date");

export const categoryTypeSchema = z.enum(["income", "expense", "transfer"]);

export const transactionInputSchema = z.object({
  date: isoDateSchema,
  categoryId: z.string().min(1),
  /** Cents. Negative is a refund; zero is meaningless so it's rejected. */
  amountCents: z.number().int().refine((n) => n !== 0, "Amount cannot be zero"),
  note: z.string().trim().max(500).optional().nullable(),
});

export const transactionPatchSchema = transactionInputSchema.partial();

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  type: categoryTypeSchema,
  icon: z.string().trim().max(60).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const categoryPatchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().max(60).optional().nullable(),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

export const dateRangeSchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

/**
 * How a category type moves the running balance. Transfers (savings) leave the
 * account just like expenses do — the distinction only matters for analysis,
 * where lumping a $10k savings transfer in with groceries would be useless.
 */
export function signOf(type: CategoryType): 1 | -1 {
  return type === "income" ? 1 : -1;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

/** Parse and validate ?from/?to, throwing a 400 rather than silently ignoring junk. */
export function getDateRange(event: H3Event) {
  const parsed = dateRangeSchema.safeParse(getQuery(event));
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid date range" });
  }
  return parsed.data;
}

export function dateRangeFilter(from?: string, to?: string) {
  const clauses = [];
  if (from) clauses.push(gte(transactions.date, from));
  if (to) clauses.push(lte(transactions.date, to));
  return clauses.length ? and(...clauses) : undefined;
}

type Db = ReturnType<typeof useDb>;

/** Totals per category type over an optional date range, always all three keys. */
export async function totalsByType(db: Db, from?: string, to?: string) {
  const rows = await db
    .select({
      type: categories.type,
      total: sql<number>`coalesce(sum(${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(dateRangeFilter(from, to))
    .groupBy(categories.type);

  const totals = { income: 0, expense: 0, transfer: 0 };
  for (const row of rows) totals[row.type] = Number(row.total);
  return totals;
}

/**
 * Running balance = opening balance, plus every transaction on or after the
 * opening date. Cheap to recompute (a few hundred rows a year), so it is never
 * materialised — no stored balance to drift out of sync.
 */
export async function computeBalance(db: Db) {
  const [config] = await db.select().from(settings).limit(1);
  const openingCents = config?.openingBalanceCents ?? 0;
  const openingDate = config?.openingBalanceDate ?? "1970-01-01";

  const totals = await totalsByType(db, openingDate);
  const balanceCents =
    openingCents + totals.income - totals.expense - totals.transfer;

  return { balanceCents, openingCents, openingDate, totals };
}

/** Active (non-archived) categories in display order. */
export function activeCategoriesFilter() {
  return isNull(categories.archivedAt);
}
