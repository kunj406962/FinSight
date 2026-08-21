import { type FormEvent } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";

export type AccountType = "chequing" | "savings" | "credit_card" | "other";

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "chequing", label: "Chequing" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

interface AccountFormProps {
  onRequestCreateConfirm: (e: FormEvent) => void;
  name: string;
  setName: (v: string) => void;
  accountType: AccountType;
  setAccountType: (v: AccountType) => void;
  startingBalance: string;
  setStartingBalance: (v: string) => void;
  createError: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
}

export function AccountForm({
  onRequestCreateConfirm,
  name,
  setName,
  accountType,
  setAccountType,
  startingBalance,
  setStartingBalance,
  createError,
  isSubmitting,
  onCancel,
}: AccountFormProps) {
  return (
    <form
      onSubmit={onRequestCreateConfirm}
      className="space-y-4 p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg"
      noValidate
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h2 className="text-sm font-semibold text-slate-200">Add New Account</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>

      {createError && <Alert type="error" message={createError} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 text-sm rounded-md text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Starting balance"
        type="number"
        step="0.01"
        hint="Balance when you started tracking this account"
        value={startingBalance}
        onChange={(e) => setStartingBalance(e.target.value)}
        disabled={isSubmitting}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          isLoading={isSubmitting}
          disabled={isSubmitting || !name.trim()}
        >
          Create account
        </Button>
      </div>
    </form>
  );
}