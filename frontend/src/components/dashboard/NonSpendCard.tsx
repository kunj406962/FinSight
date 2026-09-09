import { formatCurrency } from "../../utils/FormatCurrency";

interface Props {
  category: string;
  current: number;
  forecast: number | null;
}

export function NonSpendCard({ category, current, forecast }: Props) {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-900/50 p-4">
      <span className="text-sm font-medium text-slate-100">{category}</span>
      <div className="flex items-baseline justify-between mt-2">
        <div>
          <p className="text-xs text-slate-500">This month</p>
          <p className="text-base text-slate-100">{formatCurrency(current)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Forecast</p>
          <p className="text-base text-slate-300">
            {forecast !== null ? formatCurrency(forecast) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}