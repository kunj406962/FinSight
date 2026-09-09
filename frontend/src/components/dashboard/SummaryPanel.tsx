import { NarrationText } from "./NarrationText";
import { formatCurrency } from "../../utils/FormatCurrency";

interface Props {
  summary: string;
  narration: string;
  totalSaved: number;
  anomalyCount: number;
  onAnomalyClick: () => void;
}

export function SummaryPanel({ summary, narration, totalSaved, anomalyCount, onAnomalyClick }: Props) {
  return (
    <div className="border border-slate-800 rounded-lg bg-slate-900/80 p-4 space-y-3">
      <p className="text-sm text-slate-300">{summary}</p>
      <NarrationText text={narration} />
      <div className="flex gap-6 pt-2">
        <div>
          <p className="text-xs text-slate-500">Total saved</p>
          <p className="text-lg font-semibold text-emerald-400">{formatCurrency(totalSaved)}</p>
        </div>
        <button
          type="button"
          onClick={onAnomalyClick}
          className="text-left transition-colors duration-150 hover:opacity-80"
        >
          <p className="text-xs text-slate-500">Anomalies flagged</p>
          <p className="text-lg font-semibold text-amber-400 underline decoration-dotted">
            {anomalyCount}
          </p>
        </button>
      </div>
    </div>
  );
}