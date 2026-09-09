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

export interface UploadBatch {
  id: string;
  account_id: string;
  filename: string;
  bank_detected: string;
  transaction_count: number;
  uploaded_at: string;
}

// Add to types/models.ts — new types for Dashboard/forecast/insights.
// Existing types (Category, CATEGORY_OPTIONS, Transaction, Reconciliation, UploadBatch) unchanged.

export interface ForecastPoint {
  date: string; // ISO date string
  predicted_amount: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResponse {
  category: string;
  forecast: ForecastPoint[];
  insufficient_data: boolean;
}

export interface TopCategory {
  category: string;
  type: "fixed" | "discretionary";
  last_month_amount: number;
  forecast_amount: number;
  forecast_vs_last_month_pct: number;
  current_month_amount: number;
  expected_to_date: number;
  pace_vs_expected_pct: number | null;
}

export interface InsightResponse {
  summary: string;
  anomaly_count: number;
  top_categories: TopCategory[];
  total_saved: number;
  gemini_narration: string;
}

// Categories /forecast supports — Health/Transfer/Education are permanently
// excluded (400 from the backend), not "insufficient data."
export const FORECASTABLE_CATEGORIES = [
  "Income",
  "Utilities",
  "Rent/Mortgage",
  "Groceries",
  "Entertainment",
  "Shopping",
  "Food",
  "Savings",
  "Other",
  "Transport",
] as const;