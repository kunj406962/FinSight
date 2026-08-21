import { useState, useEffect, type FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";
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

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("chequing");
  const [startingBalance, setStartingBalance] = useState("0");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
    let isMounted = true;
    
    async function loadData() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await client.get<Account[]>("/accounts");
        if (isMounted) {
          setAccounts(response.data);
        }
      } catch {
        if (isMounted) {
          setLoadError("Couldn't load your accounts. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  function handleFormSubmitRequest(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setShowCreateConfirm(true);
  }

  async function handleConfirmCreate(): Promise<void> {
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
      setShowCreateConfirm(false);
      await fetchAccounts();
    } catch {
      setCreateError("Couldn't create the account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!pendingDeleteId) return;
    setLoadError(null);
    setIsDeleting(true);
    try {
      await client.delete(`/accounts/${pendingDeleteId}`);
      setPendingDeleteId(null);
      await fetchAccounts();
    } catch {
      setLoadError("Couldn't delete the account. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const accountToDelete = accounts.find((a) => a.id === pendingDeleteId);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
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

      {/* Metrics */}
      {!isLoading && accounts.length > 0 && (
        <AccountMetrics accounts={accounts} formatCurrency={formatCurrency} />
      )}

      {/* Form */}
      {isFormOpen && (
        <AccountForm
          onRequestCreateConfirm={handleFormSubmitRequest}
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

      {/* Error */}
      {loadError && <Alert type="error" message={loadError} />}

      {/* Account List */}
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
                onDeleteRequested={(id) => setPendingDeleteId(id)}
                isDeleting={isDeleting && pendingDeleteId === account.id}
                isDisabled={pendingDeleteId !== null || isDeleting}
                formatCurrency={formatCurrency}
              />
            ))}
          </ul>
        </div>
      )}

      {/* 1. Create Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCreateConfirm}
        title="Create New Account"
        description={`Are you sure you want to add "${name}" as a new ${accountType.replace("_", " ")} account with a starting balance of ${formatCurrency(parseFloat(startingBalance) || 0)}?`}
        confirmText="Confirm & Create"
        confirmVariant="primary"
        isLoading={isSubmitting}
        onConfirm={handleConfirmCreate}
        onCancel={() => setShowCreateConfirm(false)}
      />

      {/* 2. Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={pendingDeleteId !== null}
        title="Delete Account"
        description={`Are you sure you want to delete "${accountToDelete?.name || "this account"}"? All associated transactions will be permanently deleted. This action cannot be undone.`}
        confirmText="Delete Account"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}