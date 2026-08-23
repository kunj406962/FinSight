// src/components/transactions/TransactionRow.tsx
import { type Transaction } from "../../types/models";
import { formatCurrency } from "../../utils/FormatCurrency";

export function TransactionRow({ transaction: t }: { transaction: Transaction }) {
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