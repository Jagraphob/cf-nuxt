/**
 * Period arithmetic for budgets, shared by the server and the browser so both
 * sides agree on exactly which week a date falls in.
 *
 * Weeks run Monday to Sunday, matching how the original spreadsheet was kept
 * ("5-11 Jan", "12-18 Jan" — both Mon-Sun).
 *
 * All maths is done in UTC on dates parsed from ISO strings. Using local Date
 * objects would shift days across daylight-saving boundaries, which in NZ would
 * silently move entries into the wrong week twice a year.
 */

export type BudgetPeriod = "weekly" | "monthly";

const DAY_MS = 86_400_000;

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string): string {
  const date = toUtc(iso);
  // getUTCDay(): Sunday is 0, so Sunday must go back 6 days, not forward 1.
  const offset = (date.getUTCDay() + 6) % 7;
  return toIso(new Date(date.getTime() - offset * DAY_MS));
}

/** Sunday of the week containing `iso`. */
export function endOfWeek(iso: string): string {
  return toIso(new Date(toUtc(startOfWeek(iso)).getTime() + 6 * DAY_MS));
}

export function startOfMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${y}-${m}-01`;
}

export function endOfMonth(iso: string): string {
  const date = toUtc(iso);
  // Day 0 of the next month is the last day of this one.
  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)));
}

export function periodStart(iso: string, period: BudgetPeriod): string {
  return period === "weekly" ? startOfWeek(iso) : startOfMonth(iso);
}

export function periodEnd(iso: string, period: BudgetPeriod): string {
  return period === "weekly" ? endOfWeek(iso) : endOfMonth(iso);
}

/** Move `n` whole periods from the period containing `iso` (n may be negative). */
export function addPeriods(iso: string, period: BudgetPeriod, n: number): string {
  if (period === "weekly") {
    return toIso(new Date(toUtc(startOfWeek(iso)).getTime() + n * 7 * DAY_MS));
  }
  const date = toUtc(iso);
  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1)));
}

/**
 * How many periods `from` and `to` span, counting both ends.
 * Same period -> 1. Returns 0 when `to` falls before `from`.
 */
export function periodsBetween(from: string, to: string, period: BudgetPeriod): number {
  const start = periodStart(from, period);
  const end = periodStart(to, period);
  if (end < start) return 0;

  if (period === "weekly") {
    const weeks = (toUtc(end).getTime() - toUtc(start).getTime()) / (7 * DAY_MS);
    return Math.round(weeks) + 1;
  }
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  return (ey! - sy!) * 12 + (em! - sm!) + 1;
}

/** The day before `iso` — used to close a budget version the day its successor starts. */
export function previousDay(iso: string): string {
  return toIso(new Date(toUtc(iso).getTime() - DAY_MS));
}

/** "2026-02-16" + weekly -> "16-22 Feb", matching how she labelled sheet rows. */
export function formatPeriodLabel(iso: string, period: BudgetPeriod): string {
  if (period === "monthly") {
    return toUtc(iso).toLocaleDateString("en-NZ", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const start = toUtc(startOfWeek(iso));
  const end = toUtc(endOfWeek(iso));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startLabel = start.toLocaleDateString("en-NZ", {
    day: "numeric",
    ...(sameMonth ? {} : { month: "short" }),
    timeZone: "UTC",
  });
  const endLabel = end.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${startLabel}-${endLabel}`;
}
