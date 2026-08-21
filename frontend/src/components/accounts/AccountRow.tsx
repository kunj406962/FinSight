import { Link } from "react-router-dom";

interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: "chequing" | "savings" | "credit_card" | "other";
  starting_balance: number;
  current_balance: number;
  created_at: string;
}

interface AccountRowProps {
  account: Account;
  onDeleteRequested: (id: string) => void;
  isDeleting: boolean;
  isDisabled: boolean;
  formatCurrency: (amount: number) => string;
}

export function AccountRow({
  account,
  onDeleteRequested,
  isDeleting,
  isDisabled,
  formatCurrency,
}: AccountRowProps) {
  return (
    <li className="flex items-stretch gap-2 group">
      <Link
        to={`/accounts/${account.id}`}
        className="flex-1 flex items-center justify-between p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all"
      >
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-100 group-hover:text-emerald-400 transition-colors">
            {account.name}
          </p>
          <p className="text-xs text-slate-500 capitalize">
            {account.account_type.replace("_", " ")}
          </p>
        </div>
        <p
          className={`text-sm font-semibold tracking-tight ${
            account.current_balance < 0 ? "text-rose-400" : "text-slate-100"
          }`}
        >
          {formatCurrency(account.current_balance)}
        </p>
      </Link>

      <button
        type="button"
        title="Delete account"
        onClick={() => onDeleteRequested(account.id)}
        disabled={isDisabled}
        className="px-3.5 flex items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 hover:border-rose-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeleting ? (
          <div className="w-4 h-4 border-2 border-rose-400/20 border-t-rose-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        )}
      </button>
    </li>
  );
}