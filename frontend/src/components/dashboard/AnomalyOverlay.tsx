import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Alert } from "../ui/Alert";
import { TransactionRow } from "../transactions/TransactionRow";
import { PaginationControls } from "../transactions/PaginationControls";
import client from "../../api/client";
import type { Transaction } from "../../types/models";

const PAGE_SIZE = 50;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AnomalyOverlay({ isOpen, onClose }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset to page 1 each time the overlay is opened fresh.
  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setIsLoading(true);
    client
      .get<{ transactions: Transaction[]; total: number }>("/transactions", {
        params: { is_anomaly: true, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
      })
      .then((res) => {
        setTransactions(res.data.transactions);
        setTotal(res.data.total);
      })
      .catch(() => setError("Couldn't load anomalies."))
      .finally(() => setIsLoading(false));
  }, [isOpen, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Flagged Anomalies">
      {error && <Alert type="error" message={error} />}
      {isLoading ? (
        <p className="text-sm text-slate-400">Loading anomalies...</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-slate-500">No anomalies flagged.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => (
            <TransactionRow key={t.id} transaction={t} />
          ))}
        </div>
      )}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </Modal>
  );
}