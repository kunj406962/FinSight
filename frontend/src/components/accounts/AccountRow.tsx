import { Link } from "react-router-dom";
import { Button } from "../ui/Button";

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
  onDelete: (id: string) => Promise<void>;
  isDeleting: boolean;
  isDisabled: boolean;
  formatCurrency: (amount: number) => string;
}

export function AccountRow({
  account,
  onDelete,
  isDeleting,
  isDisabled,
  formatCurrency,
}: AccountRowProps) {
  return (
    <li className="flex items-center gap-3 group border border-slate-800/80 bg-slate-900/60 rounded-xl">
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

      <Button
        type="button"
        variant="danger"
        size="md"
        onClick={() => onDelete(account.id)}
        isLoading={isDeleting}
        disabled={isDisabled}
        className="opacity-80 hover:opacity-100"
      >
        Delete
      </Button>
    </li>
  );
}