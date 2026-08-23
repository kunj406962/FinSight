export type Category =
  | "Food" | "Groceries" | "Transport" | "Utilities" | "Entertainment"
  | "Health" | "Shopping" | "Income" | "Transfer" | "Savings"
  | "Rent/Mortgage" | "Education" | "Other";

export const CATEGORY_OPTIONS: Category[] = [
  "Food", "Groceries", "Transport", "Utilities", "Entertainment",
  "Health", "Shopping", "Income", "Transfer", "Savings",
  "Rent/Mortgage", "Education", "Other",
];

export interface Transaction {
  id: string;
  user_id: string;
  batch_id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  category: Category;
  account_type: string;
  is_anomaly: boolean;
  anomaly_score: number;
  created_at: string;
}

export interface Reconciliation {
  id: string;
  account_id: string;
  reconciled_balance: number;
  reconciled_at: string;
  created_at: string;
}