// src/pages/Transactions.tsx
import { useEffect, useState } from "react";
import client from "../api/client";
import type { Account } from "./Accounts";
import { Alert } from "../components/ui/Alert";
import { TransactionFilterBar } from "../components/transactions/TransactionFilterBar";
import { TransactionRow } from "../components/transactions/TransactionRow";
import { PaginationControls } from "../components/transactions/PaginationControls";
import { useTransactionsQuery } from "../hooks/useTransactionsQuery";

export function Transactions() {
  // Renders bare -- no AppLayout import, inherits the sidebar via
  // ProtectedRoute, same pattern as Accounts.tsx and AccountDetail.tsx.
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsError, setAccountsError] = useState("");

  // No fixedAccountId -- accountFilter starts as "" ("all accounts") and
  // is user-selectable via the filter bar's account dropdown.
  const transactionsQuery = useTransactionsQuery();

  useEffect(() => {
    (async () => {
      try {
        const response = await client.get<Account[]>("/accounts");
        setAccounts(response.data);
      } catch {
        setAccountsError("Couldn't load your accounts.");
      }
    })();
  }, []);

  const accountNameById = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Transactions</h1>
        <p className="text-xs text-slate-400">Search and filter across all of your accounts.</p>
      </div>

      {accountsError && <Alert type="error" message={accountsError} />}

      <section className="space-y-4">
        <TransactionFilterBar
          searchQuery={transactionsQuery.searchInput} onSearchChange={transactionsQuery.setSearchInput}
          categoryFilter={transactionsQuery.categoryFilter} onCategoryChange={transactionsQuery.setCategoryFilter}
          monthFilter={transactionsQuery.monthFilter} onMonthChange={transactionsQuery.setMonthFilter}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          accountFilter={transactionsQuery.accountFilter}
          onAccountChange={transactionsQuery.setAccountFilter}
        />
        {transactionsQuery.error && <Alert type="error" message={transactionsQuery.error} />}

        {transactionsQuery.isLoading ? (
          <p className="text-xs text-slate-400">Loading transactions...</p>
        ) : transactionsQuery.transactions.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-slate-800 rounded-lg bg-slate-900/30">
            <p className="text-sm font-medium text-slate-300">No transactions found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {transactionsQuery.transactions.map((t) => (
              <TransactionRow key={t.id} transaction={t} accountName={accountNameById.get(t.account_id)} />
            ))}
            <PaginationControls
              page={transactionsQuery.page}
              totalPages={transactionsQuery.totalPages}
              total={transactionsQuery.total}
              pageSize={transactionsQuery.pageSize}
              onPageChange={transactionsQuery.setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}