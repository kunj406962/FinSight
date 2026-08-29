// src/components/transactions/TransactionRow.tsx
import { type Transaction } from "../../types/models";
import { formatCurrency } from "../../utils/FormatCurrency";

interface Props {
  transaction: Transaction;
  // Optional -- AccountDetail doesn't pass this (its list is already
  // scoped to one known account, shown in the page header). The global
  // Transactions page passes it so each row shows which account it's from.
  accountName?: string;
}

export function TransactionRow({ transaction: t, accountName }: Props) {
  return (
    <div className="flex items-center justify-between p-3 border border-slate-800 rounded-lg bg-slate-950/50 hover:bg-slate-900 transition-colors mb-2">
      <div className="flex flex-col">
        <span className="text-base font-medium text-slate-100">{t.description}</span>
        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
          <span>{t.date}</span>
          <span className="w-1 h-1 rounded-full bg-slate-700"></span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {t.category}
          </span>
          {accountName && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-slate-400">{accountName}</span>
            </>
          )}
          {t.is_anomaly && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-amber-400 font-medium">Flagged</span>
            </>
          )}
        </div>
      </div>
      <div className={`text-base font-semibold ${t.amount < 0 ? "text-rose-400" : "text-emerald-400"}`}>
        {formatCurrency(t.amount)}
      </div>
    </div>
  );
}