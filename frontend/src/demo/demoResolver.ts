import { getDemoTransactions, getDemoAccounts } from "./demoTransactions";
import { toISODate } from "../utils/DateRange";
import type { Transaction } from "../types/models";

const SPEND_CATEGORIES = ["Groceries", "Food", "Transport", "Utilities", "Entertainment", "Shopping", "Rent/Mortgage"];
// Not documented anywhere in the real backend — assumption, matches the only
// two "predictable, recurring" categories in the demo dataset.
const FIXED_CATEGORIES = new Set(["Rent/Mortgage", "Utilities"]);

function sumForMonth(txns: Transaction[], category: string, year: number, month: number): number {
  return txns
    .filter((t) => t.category === category)
    .filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

function resolveTransactions(params: Record<string, unknown> | undefined) {
  let txns = getDemoTransactions();
  if (params?.account_id) txns = txns.filter((t) => t.account_id === params.account_id);
  if (params?.category) txns = txns.filter((t) => t.category === params.category);
  if (params?.is_anomaly !== undefined) txns = txns.filter((t) => t.is_anomaly === params.is_anomaly);
  if (params?.start_date) txns = txns.filter((t) => t.date >= (params.start_date as string));
  if (params?.end_date) txns = txns.filter((t) => t.date <= (params.end_date as string));
  if (params?.search) {
    const q = (params.search as string).toLowerCase();
    txns = txns.filter((t) => t.description.toLowerCase().includes(q));
  }
  const total = txns.length;
  const limit = (params?.limit as number) ?? 50;
  const offset = (params?.offset as number) ?? 0;
  return { transactions: txns.slice(offset, offset + limit), total };
}

function resolveForecast(category: string) {
  const txns = getDemoTransactions();
  const today = new Date();

  // Average over the 3 full completed months before the current one —
  // mirrors the real backend excluding the in-progress month from training.
  const monthlyTotals: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthlyTotals.push(sumForMonth(txns, category, d.getFullYear(), d.getMonth()));
  }

  const hasData = monthlyTotals.some((v) => v > 0);
  if (!hasData) {
    return { category, forecast: [], insufficient_data: true };
  }

  const avg = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
  // Always positive — matches how forecast_amount is displayed everywhere
  // else (top_categories, Gemini narration), even though the underlying
  // ledger rows for spend categories are negative.
  const forecast = [0, 1, 2].map((i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const spread = 0.1 + i * 0.05;
    return {
      date: toISODate(d),
      predicted_amount: Math.round(avg * 100) / 100,
      lower_bound: Math.round(avg * (1 - spread) * 100) / 100,
      upper_bound: Math.round(avg * (1 + spread) * 100) / 100,
    };
  });

  return { category, forecast, insufficient_data: false };
}

function resolveInsights() {
  const txns = getDemoTransactions();
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const paceFraction = today.getDate() / daysInMonth;

  const inWindow = (t: Transaction) => {
    const d = new Date(t.date);
    return (
      (d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth()) ||
      (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())
    );
  };

  const topCategories = SPEND_CATEGORIES.filter((cat) => txns.some((t) => t.category === cat)).map((cat) => {
    const lastMonthAmount = sumForMonth(txns, cat, lastMonth.getFullYear(), lastMonth.getMonth());
    const forecastRes = resolveForecast(cat);
    const forecastAmount = forecastRes.insufficient_data ? 0 : forecastRes.forecast[0].predicted_amount;
    const currentMonthAmount = sumForMonth(txns, cat, today.getFullYear(), today.getMonth());
    const expectedToDate = Math.round(forecastAmount * paceFraction * 100) / 100;
    const forecastVsLastMonthPct =
      lastMonthAmount > 0 ? Math.round(((forecastAmount - lastMonthAmount) / lastMonthAmount) * 1000) / 10 : 0;
    const paceVsExpectedPct =
      expectedToDate > 0
        ? Math.round(((currentMonthAmount - expectedToDate) / expectedToDate) * 1000) / 10
        : null;

    return {
      category: cat,
      type: FIXED_CATEGORIES.has(cat) ? "fixed" : "discretionary",
      last_month_amount: lastMonthAmount,
      forecast_amount: forecastAmount,
      forecast_vs_last_month_pct: forecastVsLastMonthPct,
      current_month_amount: currentMonthAmount,
      expected_to_date: expectedToDate,
      pace_vs_expected_pct: paceVsExpectedPct,
    };
  });

  // Scope matches the real backend: last month + current month combined.
  const anomalyCount = txns.filter((t) => t.is_anomaly && inWindow(t)).length;

  // Net cash flow (income minus spend, transfers/savings excluded) over
  // last + current month combined. A reasonable proxy for "saved" — not a
  // verified match to the real backend's exact undocumented formula.
  const totalSaved =
    Math.round(
      txns
        .filter(inWindow)
        .filter((t) => t.category !== "Transfer" && t.category !== "Savings")
        .reduce((s, t) => s + t.amount, 0) * 100
    ) / 100;

  const totalSpend = topCategories.reduce((s, c) => s + c.current_month_amount, 0);

  const summary = `So far this month you've spent $${totalSpend.toFixed(2)} across your tracked categories, saved $${totalSaved.toFixed(2)} over the last two months combined, and ${anomalyCount} anomalies flagged.`;

  const narration =
    `### Overview\n` +
    `This is a live demo account — every number here is generated relative to today's date, so it stays fresh no matter when you're viewing it. You're ${Math.round(paceFraction * 100)}% of the way through the month.\n` +
    `### Categories\n` +
    topCategories
      .map(
        (c) =>
          `* **${c.category}:** forecasted at $${c.forecast_amount.toFixed(2)}, currently at $${c.current_month_amount.toFixed(2)}`
      )
      .join("\n");

  return {
    summary,
    anomaly_count: anomalyCount,
    top_categories: topCategories,
    total_saved: totalSaved,
    gemini_narration: narration,
  };
}

export function resolveDemoRequest(
  method: string,
  url: string,
  params: Record<string, unknown> | undefined
) {
  if (method.toLowerCase() !== "get") {
    const err = new Error("Demo mode is read-only.") as Error & { isDemoReadOnly?: boolean };
    err.isDemoReadOnly = true;
    throw err;
  }
  if (url === "/accounts") return { data: getDemoAccounts() };
  if (url === "/transactions") return { data: resolveTransactions(params) };
  if (url === "/insights") return { data: resolveInsights() };
  if (url === "/forecast") return { data: resolveForecast(params?.category as string) };
  throw new Error(`No demo handler for ${method.toUpperCase()} ${url}`);
}