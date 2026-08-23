// src/pages/AccountDetail.tsx
import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from "react";
import { useParams } from "react-router-dom";
import client from "../api/client";
import type { Account } from "./Accounts";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { ConfirmationDialog } from "../components/ui/ConfirmationDialog";
import { formatCurrency } from "../utils/FormatCurrency";
import { type Transaction, type Category, CATEGORY_OPTIONS, type Reconciliation } from "../types/models";
import { TransactionFilterBar } from "../components/transactions/TransactionFilterBar";
import { TransactionRow } from "../components/transactions/TransactionRow";

interface PreviewTransaction {
  date: string;
  description: string;
  amount: number;
  predicted_category: Category;
}

interface UploadPreviewResponse {
  account_id: string;
  filename: string;
  bank_detected: string;
  transactions: PreviewTransaction[];
}

export function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();

  // --- Account State ---
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState("");

  // --- Transactions State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState("");

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  // --- Upload State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [preview, setPreview] = useState<UploadPreviewResponse | null>(null);
  const [finalCategories, setFinalCategories] = useState<Category[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  
  // --- Dialog States ---
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [showReconcileConfirm, setShowReconcileConfirm] = useState(false);

  // --- Reconciliation State ---
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [isLoadingReconciliations, setIsLoadingReconciliations] = useState(true);
  const [reconciledBalance, setReconciledBalance] = useState("");
  const [reconciledAt, setReconciledAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmittingReconciliation, setIsSubmittingReconciliation] = useState(false);
  const [reconciliationError, setReconciliationError] = useState("");

  const fetchAccount = useCallback(async () => {
    if (!accountId) return;
    try {
      const response = await client.get<Account[]>("/accounts");
      const found = response.data.find((a) => a.id === accountId);
      if (found) setAccount(found);
      else setAccountError("Account not found.");
    } catch {
      setAccountError("Couldn't load this account.");
    } finally {
      setIsLoadingAccount(false);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async () => {
    if (!accountId) return;
    try {
      const response = await client.get<{ transactions: Transaction[] }>(
        "/transactions",
        { params: { account_id: accountId } }
      );
      setTransactions(response.data.transactions ?? []);
      setTransactionsError("");
    } catch {
      setTransactionsError("Couldn't load transactions for this account.");
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [accountId]);

  const fetchReconciliations = useCallback(async () => {
    if (!accountId) return;
    try {
      const response = await client.get<Reconciliation[]>(`/accounts/${accountId}/reconciliations`);
      setReconciliations(response.data);
    } catch {
      setReconciliationError("Couldn't load reconciliation history.");
    } finally {
      setIsLoadingReconciliations(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (!accountId) return;

    (async () => {
      try {
        const response = await client.get<Account[]>("/accounts");
        const found = response.data.find((a) => a.id === accountId);
        if (found) setAccount(found);
        else setAccountError("Account not found.");
      } catch {
        setAccountError("Couldn't load this account.");
      } finally {
        setIsLoadingAccount(false);
      }
    })();

    (async () => {
      try {
        const response = await client.get<{ transactions: Transaction[] }>(
          "/transactions",
          { params: { account_id: accountId } }
        );
        setTransactions(response.data.transactions ?? []);
        setTransactionsError("");
      } catch {
        setTransactionsError("Couldn't load transactions for this account.");
      } finally {
        setIsLoadingTransactions(false);
      }
    })();

    (async () => {
      try {
        const response = await client.get<Reconciliation[]>(`/accounts/${accountId}/reconciliations`);
        setReconciliations(response.data);
      } catch {
        setReconciliationError("Couldn't load reconciliation history.");
      } finally {
        setIsLoadingReconciliations(false);
      }
    })();
  }, [accountId]);
 
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = categoryFilter ? t.category === categoryFilter : true;
      const matchesMonth = monthFilter ? t.date.startsWith(monthFilter) : true;
      return matchesSearch && matchesCat && matchesMonth;
    });
  }, [transactions, searchQuery, categoryFilter, monthFilter]);

  const handlePreviewSubmit = async () => {
    if (!selectedFile || !accountId) return;
    setIsPreviewing(true);
    setPreviewError("");
    try {
      const formData = new FormData();
      formData.append("account_id", accountId);
      formData.append("file", selectedFile);
      const response = await client.post<UploadPreviewResponse>("/upload/preview", formData);
      setPreview(response.data);
      setFinalCategories(response.data.transactions.map((t) => t.predicted_category));
    } catch {
      setPreviewError("Couldn't preview this file. Please check the format and try again.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!preview || !accountId) return;
    setIsConfirming(true);
    setConfirmError("");
    try {
      await client.post("/upload/confirm", {
        account_id: accountId,
        filename: preview.filename,
        bank_detected: preview.bank_detected,
        transactions: preview.transactions.map((t, i) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          predicted_category: t.predicted_category,
          final_category: finalCategories[i],
        })),
      });
      setPreview(null);
      setSelectedFile(null);
      setShowUploadConfirm(false);
      await Promise.all([fetchAccount(), fetchTransactions()]);
    } catch {
      setConfirmError("Couldn't save these transactions.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRecordReconciliation = async () => {
    if (!accountId || !reconciledBalance) return;
    setIsSubmittingReconciliation(true);
    setReconciliationError("");
    try {
      await client.post(`/accounts/${accountId}/reconciliations`, {
        reconciled_balance: parseFloat(reconciledBalance) || 0,
        reconciled_at: reconciledAt,
      });
      setReconciledBalance("");
      setShowReconcileConfirm(false);
      await Promise.all([fetchAccount(), fetchReconciliations()]);
    } catch {
      setReconciliationError("Couldn't record this reconciliation.");
    } finally {
      setIsSubmittingReconciliation(false);
    }
  };

  if (isLoadingAccount) return <div className="space-y-6 max-w-4xl text-slate-400">Loading account...</div>;
  if (accountError || !account) return <Alert type="error" message={accountError || "Account not found."} />;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">{account.name}</h1>
        <p className="text-xs text-slate-400">{account.account_type.replace("_", " ")} · Starting balance {formatCurrency(account.starting_balance)}</p>
        <p data-testid="current-balance" className={`text-lg font-medium ${account.current_balance < 0 ? "text-rose-400" : "text-slate-100"}`}>
          {formatCurrency(account.current_balance)}
        </p>
      </div>

      {/* Upload Section */}
      <section className="space-y-4">
        <h2  className="text-lg font-medium text-slate-100">Upload Statement</h2>
        {!preview ? (
          <div className="space-y-2">
            <input aria-label="Upload Statement" type="file" accept=".csv" onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedFile(e.target.files?.[0] ?? null)} className="text-slate-300" />
            {previewError && <Alert type="error" message={previewError} />}
            <Button onClick={handlePreviewSubmit} isLoading={isPreviewing} disabled={!selectedFile}>Preview Upload</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">{preview.filename} — {preview.transactions.length} transactions</p>
            <div className="space-y-2">
              {preview.transactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between gap-2 border border-slate-800 bg-slate-900/50 rounded-md p-3">
                  <div className="text-sm text-slate-100">
                    <div className="font-medium">{t.description}</div>
                    <div className="text-xs text-slate-400">{t.date} · {formatCurrency(t.amount)}</div>
                  </div>
                  <select
                    value={finalCategories[i]}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFinalCategories((prev) => { const next = [...prev]; next[i] = e.target.value as Category; return next; })}
                    className="bg-slate-950 border border-slate-700 rounded-md text-sm text-slate-100 p-1.5 focus:ring-1 focus:ring-emerald-500"
                  >
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {confirmError && <Alert type="error" message={confirmError} />}
            <div className="flex gap-2">
              <Button onClick={() => setShowUploadConfirm(true)} variant="primary">Confirm Upload</Button>
              <Button variant="danger" onClick={() => setShowDiscardConfirm(true)}>Discard</Button>
            </div>
          </div>
        )}
      </section>

      {/* Reconcile Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-100">Reconcile Balance</h2>
        <div className="space-y-3">
          <Input label="Reconciled balance" type="number" step="0.01" value={reconciledBalance} onChange={(e: ChangeEvent<HTMLInputElement>) => setReconciledBalance(e.target.value)} />
          <Input label="As of date" type="date" value={reconciledAt} onChange={(e: ChangeEvent<HTMLInputElement>) => setReconciledAt(e.target.value)} />
          {reconciliationError && <Alert type="error" message={reconciliationError} />}
          <Button onClick={() => setShowReconcileConfirm(true)} disabled={!reconciledBalance || isSubmittingReconciliation} isLoading={isSubmittingReconciliation} variant="primary">Record Reconciliation</Button>
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-medium text-slate-300">History</h3>
          {isLoadingReconciliations ? (
            <p className="text-xs text-slate-400">Loading history...</p>
          ) : reconciliations.length === 0 ? (
            <p className="text-xs text-slate-500">No reconciliations recorded yet.</p>
          ) : (
            reconciliations.map((r) => (
              <div key={r.id} className="flex justify-between text-sm text-slate-100 border-b border-slate-900 py-2">
                <span className="text-slate-400">{r.reconciled_at}</span>
                <span className="font-medium">{formatCurrency(r.reconciled_balance)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Transactions Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium text-slate-100">Transactions</h2>
        <TransactionFilterBar 
          searchQuery={searchQuery} onSearchChange={setSearchQuery}
          categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
          monthFilter={monthFilter} onMonthChange={setMonthFilter}
        />
        {transactionsError && <Alert type="error" message={transactionsError} />}
        
        {isLoadingTransactions ? (
          <p className="text-xs text-slate-400">Loading transactions...</p>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-6 text-center border border-dashed border-slate-800 rounded-lg bg-slate-900/30">
            <p className="text-sm font-medium text-slate-300">No transactions yet</p>
            <p className="text-xs text-slate-500 mt-1">Adjust your filters or upload a statement to see your history.</p>
          </div>
        ) : (
          filteredTransactions.map((t) => <TransactionRow key={t.id} transaction={t} />)
        )}
      </section>

      {/* Dialogs */}
      <ConfirmationDialog
        isOpen={showDiscardConfirm} title="Discard Preview"
        description="Are you sure you want to discard this upload? This action cannot be undone."
        confirmText="Discard" confirmVariant="danger"
        onConfirm={() => { setPreview(null); setShowDiscardConfirm(false); setSelectedFile(null); }}
        onCancel={() => setShowDiscardConfirm(false)}
      />
      <ConfirmationDialog
        isOpen={showUploadConfirm} title="Confirm Upload"
        description="Are you sure you want to save these transactions to your account?"
        confirmText="Save Transactions" confirmVariant="primary"
        isLoading={isConfirming}
        onConfirm={handleConfirmUpload} onCancel={() => setShowUploadConfirm(false)}
      />
      <ConfirmationDialog
        isOpen={showReconcileConfirm} title="Record Reconciliation"
        description={`Record a balance of ${formatCurrency(parseFloat(reconciledBalance) || 0)} for this account?`}
        confirmText="Record" confirmVariant="primary"
        isLoading={isSubmittingReconciliation}
        onConfirm={handleRecordReconciliation} onCancel={() => setShowReconcileConfirm(false)}
      />
    </div>
  );
}