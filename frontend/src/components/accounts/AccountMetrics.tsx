interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: "chequing" | "savings" | "credit_card" | "other";
  starting_balance: number;
  current_balance: number;
  created_at: string;
}

interface AccountMetricsProps {
  accounts: Account[];
  formatCurrency: (amount: number) => string;
}

export function AccountMetrics({ accounts, formatCurrency }: AccountMetricsProps) {
  const totalBalance = accounts.reduce((acc, curr) => acc + curr.current_balance, 0);
  const totalAccounts = accounts.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl">
      <div>
        <span className="text-xs font-medium text-slate-400">Total Portfolio Value</span>
        <p className={`text-2xl font-bold tracking-tight ${totalBalance < 0 ? "text-rose-400" : "text-emerald-400"}`}>
          {formatCurrency(totalBalance)}
        </p>
      </div>
      <div>
        <span className="text-xs font-medium text-slate-400">Active Accounts</span>
        <p className="text-2xl font-bold tracking-tight text-slate-100">{totalAccounts}</p>
      </div>
    </div>
  );
}