import { useEffect, useState } from "react";
import client from "../api/client";
import { Alert } from "../components/ui/Alert";
import { SummaryPanel } from "../components/dashboard/SummaryPanel";
import { CategoryCard } from "../components/dashboard/CategoryCard";
import { NonSpendCard } from "../components/dashboard/NonSpendCard";
import { CategoryForecastOverlay } from "../components/dashboard/CategoryForecastOverlay";
import { AnomalyOverlay } from "../components/dashboard/AnomalyOverlay";
import { getMonthBounds } from "../utils/DateRange";
import type { InsightResponse, TopCategory, ForecastResponse } from "../types/models";
import { FORECASTABLE_CATEGORIES } from "../types/models";

type ForecastByCategory = Record<string, ForecastResponse>;

// Categories /insights excludes from top_categories (not spend) but /forecast
// still supports — shown as their own section below the spend categories.
const NON_SPEND_CATEGORIES = ["Income", "Savings"] as const;

// Use the nearest upcoming forecast point (first in the list) — the same
// value /insights surfaces as forecast_amount for spend categories.
function getCurrentMonthForecast(forecast: ForecastResponse | undefined): number | null {
  if (!forecast || forecast.forecast.length === 0) return null;
  return forecast.forecast[0].predicted_amount;
}

export function Dashboard() {
  const [insights, setInsights] = useState<InsightResponse | null>(null);
  const [forecasts, setForecasts] = useState<ForecastByCategory>({});
  const [nonSpendCurrent, setNonSpendCurrent] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAnomalyOverlay, setShowAnomalyOverlay] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError("");
      try {
        const { start, end } = getMonthBounds();

        const [insightsRes, ...rest] = await Promise.all([
          client.get<InsightResponse>("/insights"),
          ...FORECASTABLE_CATEGORIES.map((category) =>
            client
              .get<ForecastResponse>("/forecast", { params: { category } })
              .then((res) => ({ kind: "forecast" as const, category, data: res.data }))
              .catch(() => ({ kind: "forecast" as const, category, data: null }))
          ),
          ...NON_SPEND_CATEGORIES.map((category) =>
            client
              .get<{ transactions: { amount: number }[]; total: number }>("/transactions", {
                params: { category, start_date: start, end_date: end, limit: 200 },
              })
              .then((res) => ({
                kind: "current" as const,
                category,
                total: res.data.transactions.reduce((sum, t) => sum + t.amount, 0),
              }))
              .catch(() => ({ kind: "current" as const, category, total: 0 }))
          ),
        ]);

        setInsights(insightsRes.data);

        const byCategory: ForecastByCategory = {};
        const nonSpendTotals: Record<string, number> = {};
        for (const result of rest) {
          if (result.kind === "forecast" && result.data) {
            byCategory[result.category] = result.data;
          } else if (result.kind === "current") {
            nonSpendTotals[result.category] = result.total;
          }
        }
        setForecasts(byCategory);
        setNonSpendCurrent(nonSpendTotals);
      } catch {
        setError("Couldn't load your dashboard.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Dashboard</h1>
        <p className="text-xs text-slate-400">Your spending, forecasted and summarized.</p>
      </div>

      {error && <Alert type="error" message={error} />}

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading your dashboard...</p>
      ) : insights ? (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-slate-100">Summary</h2>
            <SummaryPanel
              summary={insights.summary}
              narration={insights.gemini_narration}
              totalSaved={insights.total_saved}
              anomalyCount={insights.anomaly_count}
              onAnomalyClick={() => setShowAnomalyOverlay(true)}
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium text-slate-100">Categories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.top_categories
                .filter((cat: TopCategory) => forecasts[cat.category])
                .map((cat: TopCategory) => (
                  <CategoryCard
                    key={cat.category}
                    category={cat}
                    onClick={() => setSelectedCategory(cat.category)}
                  />
                ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium text-slate-100">Income &amp; Savings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {NON_SPEND_CATEGORIES.map((category) => (
                <NonSpendCard
                  key={category}
                  category={category}
                  current={nonSpendCurrent[category] ?? 0}
                  forecast={getCurrentMonthForecast(forecasts[category])}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}

      <CategoryForecastOverlay
        category={selectedCategory}
        forecast={selectedCategory ? forecasts[selectedCategory] : undefined}
        onClose={() => setSelectedCategory(null)}
      />
      <AnomalyOverlay isOpen={showAnomalyOverlay} onClose={() => setShowAnomalyOverlay(false)} />
    </div>
  );
}