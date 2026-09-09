import { formatCurrency } from "../../utils/FormatCurrency";
import type { TopCategory } from "../../types/models";

interface Props {
  category: TopCategory;
  onClick: () => void;
}

export function CategoryCard({ category: cat, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-slate-800 rounded-lg bg-slate-900/50 p-4 hover:border-slate-700 transition-all duration-150 ease-in-out"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-100">{cat.category}</span>
        <span className="text-xs text-slate-500">
          {cat.type === "fixed" ? "Fixed" : "Discretionary"}
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <div>
          <p className="text-xs text-slate-500">This month</p>
          <p className="text-base text-slate-100">{formatCurrency(cat.current_month_amount)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Forecast</p>
          <p className="text-base text-slate-300">{formatCurrency(cat.forecast_amount)}</p>
        </div>
      </div>
      {cat.pace_vs_expected_pct !== null && (
        <p
          className={
            "text-xs mt-2 " +
            (cat.pace_vs_expected_pct > 0 ? "text-rose-400" : "text-emerald-400")
          }
        >
          {cat.pace_vs_expected_pct > 0 ? "+" : ""}
          {cat.pace_vs_expected_pct.toFixed(0)}% vs. expected pace
        </p>
      )}
    </button>
  );
}