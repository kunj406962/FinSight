import { useState, useEffect, type FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { AccountMetrics } from "../components/accounts/AccountMetrics";
import { AccountForm, type AccountType } from "../components/accounts/AccountForm";
import { AccountRow } from "../components/accounts/AccountRow";
import { EmptyAccountsState } from "../components/accounts/EmptyAccountsState";
import client from "../api/client";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  starting_balance: number;
  current_balance: number;
  created_at: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("chequing");
  const [startingBalance, setStartingBalance] = useState("0");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchAccounts(): Promise<void> {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await client.get<Account[]>("/accounts");
      setAccounts(response.data);
    } catch {
      setLoadError("Couldn't load your accounts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) return;

    setCreateError(null);
    setIsSubmitting(true);
    try {
      await client.post("/accounts", {
        name,
        account_type: accountType,
        starting_balance: parseFloat(startingBalance) || 0,
      });
      setName("");
      setAccountType("chequing");
      setStartingBalance("0");
      setIsFormOpen(false);
      await fetchAccounts();
    } catch {
      setCreateError("Couldn't create the account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(accountId: string): Promise<void> {
    if (!window.confirm("Delete this account and all its transactions? This cannot be undone.")) {
      return;
    }
    setLoadError(null);
    setDeletingId(accountId);
    try {
      await client.delete(`/accounts/${accountId}`);
      await fetchAccounts();
    } catch {
      setLoadError("Couldn't delete the account. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Accounts
          </h1>
          <p className="text-xs text-slate-400">
            Manage the accounts you upload bank statements for.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          onClick={() => setIsFormOpen((open) => !open)}
        >
          {isFormOpen ? "Cancel" : "New account"}
        </Button>
      </div>

      {/* Summary Metrics */}
      {!isLoading && accounts.length > 0 && (
        <AccountMetrics accounts={accounts} formatCurrency={formatCurrency} />
      )}

      {/* Creation Form */}
      {isFormOpen && (
        <AccountForm
          onSubmit={handleCreate}
          name={name}
          setName={setName}
          accountType={accountType}
          setAccountType={setAccountType}
          startingBalance={startingBalance}
          setStartingBalance={setStartingBalance}
          createError={createError}
          isSubmitting={isSubmitting}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      {/* Error State */}
      {loadError && <Alert type="error" message={loadError} />}

      {/* Content Area */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Loading accounts...
        </div>
      ) : accounts.length === 0 ? (
        <EmptyAccountsState onOpenForm={() => setIsFormOpen(true)} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
            <span>Account Details</span>
            <span className="pr-16">Balance</span>
          </div>
          <ul className="space-y-2">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onDelete={handleDelete}
                isDeleting={deletingId === account.id}
                isDisabled={deletingId !== null}
                formatCurrency={formatCurrency}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}