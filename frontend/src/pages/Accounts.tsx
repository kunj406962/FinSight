// pages/Accounts.tsx
import { useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import client from "../api/client";

type AccountType = "chequing" | "savings" | "credit_card" | "other";

interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  created_at: string;
}

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "chequing", label: "Chequing" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

export function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("chequing");
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
      await client.post("/accounts", { name, account_type: accountType });
      setName("");
      setAccountType("chequing");
      setIsFormOpen(false);
      await fetchAccounts();
    } catch {
      setCreateError("Couldn't create the account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
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

      {isFormOpen && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 p-4 rounded-lg border border-slate-800 bg-slate-900/80"
          noValidate
        >
          {createError && <Alert type="error" message={createError} />}

          <Input
            label="Account name"
            type="text"
            required
            placeholder="e.g. RBC Chequing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="space-y-1.5 w-full">
            <label htmlFor="account-type" className="text-xs font-medium text-slate-300">
              Account type
            </label>
            <select
              id="account-type"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as AccountType)}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 text-sm rounded-md text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting || !name.trim()}
          >
            Create account
          </Button>
        </form>
      )}

      {loadError && <Alert type="error" message={loadError} />}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading accounts...</p>
      ) : accounts.length === 0 ? (
        <div className="p-6 rounded-lg border border-slate-800 bg-slate-900/80 text-center space-y-1">
          <p className="text-sm text-slate-300">No accounts yet</p>
          <p className="text-xs text-slate-500">
            Create an account to start uploading bank statements.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id}>
              <Link
                to={`/accounts/${account.id}`}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{account.name}</p>
                  <p className="text-xs text-slate-500 capitalize">
                    {account.account_type.replace("_", " ")}
                  </p>
                </div>
                <span className="text-slate-500">→</span>
              </Link>
            </li>
          ))}
        </ul>
       )}
    </div>
    
  );
}