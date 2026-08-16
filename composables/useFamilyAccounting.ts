import type { CategoryType } from "~/lib/db/schema/accounting";

export interface CategoryDto {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  sortOrder: number;
  archivedAt: number | null;
}

export interface TransactionDto {
  id: string;
  date: string;
  amountCents: number;
  note: string | null;
  createdBy: string;
  categoryId: string;
  categoryName: string;
  categoryType: CategoryType;
  categoryIcon: string | null;
}

export interface SummaryDto {
  from: string | null;
  to: string | null;
  totals: { income: number; expense: number; transfer: number; net: number };
  byCategory: {
    categoryId: string;
    name: string;
    type: CategoryType;
    icon: string | null;
    totalCents: number;
    count: number;
  }[];
}

export interface TrendPointDto {
  month: string;
  income: number;
  expense: number;
  transfer: number;
  net: number;
}

export interface BalanceDto {
  balanceCents: number;
  openingCents: number;
  openingDate: string;
  totals: { income: number; expense: number; transfer: number };
}

const API = "/api/family-accounting";

const nzd = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

export function useFamilyAccounting() {
  /**
   * Not plain $fetch: during SSR that would call our own API without the incoming
   * session cookie and get a 401 back. useRequestFetch forwards the request
   * headers on the server and is just $fetch in the browser.
   */
  const request = useRequestFetch();

  /** Cents to "$1,234.56". Everything is stored in cents; formatting happens here only. */
  function formatMoney(cents: number): string {
    return nzd.format(cents / 100);
  }

  /** Cents to "1234.56" for form inputs — no symbol, no separators. */
  function centsToInput(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  /**
   * Parse what someone typed into cents. Rounds rather than truncates so
   * "10.005" doesn't quietly lose a cent, and rejects anything non-numeric.
   */
  function inputToCents(value: string): number | null {
    const cleaned = value.replace(/[\s,$]/g, "");
    if (!cleaned || !/^-?\d*\.?\d*$/.test(cleaned)) return null;
    const parsed = Number(cleaned);
    if (!Number.isFinite(parsed)) return null;
    return Math.round(parsed * 100);
  }

  /** Local ISO date — never via toISOString(), which would shift NZ dates back a day. */
  function toIsoDate(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function today(): string {
    return toIsoDate(new Date());
  }

  /** "2026-01-11" -> "Sun 11 Jan 2026" */
  function formatDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  /** "2026-01" -> "Jan 26" */
  function formatMonth(month: string): string {
    const [y, m] = month.split("-").map(Number);
    return new Date(y!, m! - 1, 1).toLocaleDateString("en-NZ", {
      month: "short",
      year: "2-digit",
    });
  }

  /** How a category type moves the balance — mirrors signOf() on the server. */
  function signOf(type: CategoryType): 1 | -1 {
    return type === "income" ? 1 : -1;
  }

  /** Signed, display-ready amount: "+$2,488.75" or "-$446.33". */
  function formatSigned(cents: number, type: CategoryType): string {
    const sign = signOf(type) === 1 ? "+" : "-";
    return `${sign}${formatMoney(Math.abs(cents))}`;
  }

  const api = {
    categories: (includeArchived = false) =>
      request<CategoryDto[]>(`${API}/categories`, {
        query: includeArchived ? { includeArchived: 1 } : {},
      }),
    createCategory: (body: Partial<CategoryDto>) =>
      request<CategoryDto>(`${API}/categories`, { method: "POST", body }),
    updateCategory: (id: string, body: Record<string, unknown>) =>
      request<CategoryDto>(`${API}/categories/${id}`, { method: "PATCH", body }),
    deleteCategory: (id: string) =>
      request<{ deleted: boolean }>(`${API}/categories/${id}`, { method: "DELETE" }),

    transactions: (query: Record<string, unknown> = {}) =>
      request<TransactionDto[]>(`${API}/transactions`, { query }),
    transaction: (id: string) => request<TransactionDto>(`${API}/transactions/${id}`),
    createTransactions: (body: unknown) =>
      request(`${API}/transactions`, { method: "POST", body }),
    updateTransaction: (id: string, body: Record<string, unknown>) =>
      request(`${API}/transactions/${id}`, { method: "PATCH", body }),
    deleteTransaction: (id: string) =>
      request<{ deleted: boolean }>(`${API}/transactions/${id}`, { method: "DELETE" }),

    balance: () => request<BalanceDto>(`${API}/balance`),
    summary: (query: Record<string, unknown> = {}) =>
      request<SummaryDto>(`${API}/summary`, { query }),
    trend: (query: Record<string, unknown> = {}) =>
      request<TrendPointDto[]>(`${API}/trend`, { query }),
  };

  return {
    api,
    formatMoney,
    formatSigned,
    centsToInput,
    inputToCents,
    toIsoDate,
    today,
    formatDate,
    formatMonth,
    signOf,
  };
}

/** Named date ranges shared by the history and analysis pages. */
export function useDateRanges() {
  const { toIsoDate } = useFamilyAccounting();

  function monthRange(offset = 0) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    return { from: toIsoDate(start), to: toIsoDate(end) };
  }

  const presets = [
    { key: "this-month", label: "This month", range: () => monthRange(0) },
    { key: "last-month", label: "Last month", range: () => monthRange(-1) },
    {
      key: "this-year",
      label: "This year",
      range: () => {
        const year = new Date().getFullYear();
        return { from: `${year}-01-01`, to: `${year}-12-31` };
      },
    },
    { key: "all", label: "All time", range: () => ({ from: undefined, to: undefined }) },
  ] as const;

  return { presets, monthRange };
}
