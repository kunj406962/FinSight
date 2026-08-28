import { useEffect, useState } from "react";
import client from "../api/client";
import { type Transaction } from "../types/models";

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

function monthToDateRange(month: string): { start_date?: string; end_date?: string } {
  if (!month) return {};
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 0)); // last day of the month
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start_date: fmt(start), end_date: fmt(end) };
}

interface UseTransactionsQueryResult {
  transactions: Transaction[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  searchInput: string;
  categoryFilter: string;
  monthFilter: string;
  accountFilter: string;
  setSearchInput: (val: string) => void;
  setCategoryFilter: (val: string) => void;
  setMonthFilter: (val: string) => void;
  setAccountFilter: (val: string) => void;
  setPage: (val: number) => void;
  refetch: () => void;
}

/**
 * Shared fetch/filter/pagination logic for GET /transactions.
 *
 * Used by both AccountDetail (pass a fixedAccountId -- the account filter
 * stays locked to it and no account dropdown is shown) and the global
 * Transactions page (call with no argument -- accountFilter starts as ""
 * meaning "all accounts", and is user-selectable).
 *
 * Filtering/search/pagination all happen server-side via GET /transactions'
 * account_id/category/start_date/end_date/search/limit/offset params --
 * replaces the previous client-side useMemo filter, which didn't scale
 * once a single account's (or a user's total) transaction count grows.
 */
export function useTransactionsQuery(fixedAccountId?: string): UseTransactionsQueryResult {
  const [accountFilter, setAccountFilter] = useState(fixedAccountId ?? "");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [refetchToken, setRefetchToken] = useState(0);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce the search box. setState happens inside the timeout callback,
  // not synchronously in the effect body -- this is the "subscribe, then
  // setState in a later callback" shape, not the AppLayout-style
  // set-state-in-effect anti-pattern (see below).
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Reset to page 1 whenever a filter changes. Done as a render-time
  // conditional setState (comparing against the previous filter key),
  // deliberately NOT inside a useEffect -- an effect that calls setState
  // purely to sync a derived comparison is the exact anti-pattern already
  // hit and fixed once in this codebase (AppLayout). Doing the same thing
  // here as an effect would very likely re-trigger the same
  // set-state-in-effect lint false-positive already fought on AccountDetail.
  const filterKey = `${accountFilter}|${categoryFilter}|${monthFilter}|${debouncedSearch}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { start_date, end_date } = monthToDateRange(monthFilter);
        const params: Record<string, string | number> = {
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        };
        if (accountFilter) params.account_id = accountFilter;
        if (categoryFilter) params.category = categoryFilter;
        if (debouncedSearch) params.search = debouncedSearch;
        if (start_date) params.start_date = start_date;
        if (end_date) params.end_date = end_date;

        const response = await client.get("/transactions", { params });
        setTransactions(response.data.transactions ?? []);
        setTotal(response.data.total ?? 0);
      } catch {
        setError("Couldn't load transactions.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [accountFilter, categoryFilter, monthFilter, debouncedSearch, page, refetchToken]);

  return {
    transactions,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    pageSize: PAGE_SIZE,
    isLoading,
    error,
    searchInput,
    categoryFilter,
    monthFilter,
    accountFilter,
    setSearchInput,
    setCategoryFilter,
    setMonthFilter,
    setAccountFilter,
    setPage,
    refetch: () => setRefetchToken((t) => t + 1),
  };
}