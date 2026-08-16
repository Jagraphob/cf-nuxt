import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { BudgetPeriod } from "../../periods";

/**
 * Family accounting tables.
 *
 * Money is stored as integer cents — D1 is SQLite, and REAL columns drift once you
 * start summing them. Dates are stored as ISO 'YYYY-MM-DD' text rather than epoch
 * millis: NZ is UTC+12/13, so a timestamp would put entries on the wrong day, and
 * ISO strings still sort chronologically for BETWEEN ranges and substr() grouping.
 */

/** A category's type decides which direction its transactions move the balance. */
export const CATEGORY_TYPES = ["income", "expense", "transfer"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").$type<CategoryType>().notNull(),
    icon: text("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Soft delete — archived categories stay out of pickers but keep their history. */
    archivedAt: integer("archived_at"),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("categories_name_type_idx").on(t.name, t.type)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    /** ISO 'YYYY-MM-DD'. */
    date: text("date").notNull(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    /** Always in cents. Negative is allowed, to express a refund against a category. */
    amountCents: integer("amount_cents").notNull(),
    note: text("note"),
    /** Session email of whoever entered it — the ledger itself is shared. */
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("transactions_date_idx").on(t.date),
    index("transactions_category_id_idx").on(t.categoryId),
  ],
);

/** Singleton row (id is always 1) holding the ledger's starting point. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),
  openingBalanceCents: integer("opening_balance_cents").notNull().default(0),
  openingBalanceDate: text("opening_balance_date").notNull(),
  currency: text("currency").notNull().default("NZD"),
});

/**
 * Budgets are a plan, not money — they never appear in `transactions` and never
 * move the account balance. Putting them there would break the ledger.
 *
 * Rows are effective-dated versions: changing an amount closes the current row
 * and opens a new one, so past periods keep the figure they were actually judged
 * against instead of being retroactively rewritten. Boundaries are always
 * aligned to a period start, which is what stops a period being counted twice
 * (once for the old version, once for the new) when an amount changes mid-week.
 */
export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id),
    period: text("period").$type<BudgetPeriod>().notNull(),
    amountCents: integer("amount_cents").notNull(),
    /** Period-aligned first day this version applies to. */
    startDate: text("start_date").notNull(),
    /** Last day this version applies to; null means it is still in force. */
    endDate: text("end_date"),
    createdBy: text("created_by").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("budgets_category_id_idx").on(t.categoryId),
    index("budgets_start_date_idx").on(t.startDate),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
