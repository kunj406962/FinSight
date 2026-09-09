import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Modal } from "../ui/Modal";
import { Alert } from "../ui/Alert";
import { TransactionRow } from "../transactions/TransactionRow";
import client from "../../api/client";
import { getMonthBounds } from "../../utils/DateRange";
import type { ForecastResponse, Transaction } from "../../types/models";

interface Props {
  category: string | null;
  forecast: ForecastResponse | undefined;
  onClose: () => void;
}

export function CategoryForecastOverlay({ category, forecast, onClose }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!category) return;
    // Inline async IIFE — same established pattern as AccountDetail's mount
    // effect, avoids the set-state-in-effect false trigger.
    (async () => {
      setTransactions([]);
      setError("");
      setIsLoading(true);
      const { start, end } = getMonthBounds();
      try {
        const res = await client.get<{ transactions: Transaction[] }>("/transactions", {
          params: { category, start_date: start, end_date: end, limit: 200 },
        });
        setTransactions(res.data.transactions);
      } catch {
        setError("Couldn't load this month's transactions.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [category]);

  return (
    <Modal isOpen={category !== null} onClose={onClose} title={category ?? ""}>
      {forecast && (
        <div className="h-56 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast.forecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Line type="monotone" dataKey="predicted_amount" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lower_bound" stroke="#64748b" strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="upper_bound" stroke="#64748b" strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h3 className="text-sm font-medium text-slate-100 mb-2">This month's transactions</h3>
      {error && <Alert type="error" message={error} />}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading transactions...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-slate-500">No transactions recorded yet this month.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      )}
    </Modal>
  );
}