import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import { Dashboard } from "../Dashboard";
import client from "../../api/client";

vi.mock("../../api/client", () => {
  const mockClient = { get: vi.fn() };
  return { default: mockClient, client: mockClient };
});

const insightsMock = {
  summary: "Summary text.",
  anomaly_count: 2,
  top_categories: [
    {
      category: "Groceries",
      type: "discretionary",
      last_month_amount: 100,
      forecast_amount: 150,
      forecast_vs_last_month_pct: 50,
      current_month_amount: 50,
      expected_to_date: 40,
      pace_vs_expected_pct: 25,
    },
    {
      // Health has no forecast support — should never render as a card.
      category: "Health",
      type: "discretionary",
      last_month_amount: 20,
      forecast_amount: 0,
      forecast_vs_last_month_pct: 0,
      current_month_amount: 10,
      expected_to_date: 5,
      pace_vs_expected_pct: null,
    },
  ],
  total_saved: 300,
  gemini_narration: "### Overview\nYou spent nothing yet.",
};

function forecastFor(category: string) {
  return {
    category,
    forecast: [{ date: "2026-09-01", predicted_amount: category === "Income" ? 800 : 100, lower_bound: 80, upper_bound: 120 }],
    insufficient_data: false,
  };
}

const groceriesTx = [
  { id: "g1", user_id: "u1", batch_id: "b1", account_id: "a1", date: "2026-09-05", description: "Corner Store", amount: -50, category: "Groceries", account_type: "chequing", is_anomaly: false, anomaly_score: null, created_at: "2026-09-05T00:00:00Z" },
];
const incomeTx = [
  { id: "i1", user_id: "u1", batch_id: "b1", account_id: "a1", date: "2026-09-01", description: "Paycheck", amount: 500, category: "Income", account_type: "chequing", is_anomaly: false, anomaly_score: null, created_at: "2026-09-01T00:00:00Z" },
  { id: "i2", user_id: "u1", batch_id: "b1", account_id: "a1", date: "2026-09-02", description: "Bonus", amount: 27, category: "Income", account_type: "chequing", is_anomaly: false, anomaly_score: null, created_at: "2026-09-02T00:00:00Z" },
];
const anomalyPage1 = [
  { id: "an1", user_id: "u1", batch_id: "b1", account_id: "a1", date: "2026-08-01", description: "Odd Charge", amount: -999, category: "Shopping", account_type: "chequing", is_anomaly: true, anomaly_score: 0.9, created_at: "2026-08-01T00:00:00Z" },
];
const anomalyPage2 = [
  { id: "an2", user_id: "u1", batch_id: "b1", account_id: "a1", date: "2026-07-01", description: "Another Odd Charge", amount: -888, category: "Shopping", account_type: "chequing", is_anomaly: true, anomaly_score: 0.8, created_at: "2026-07-01T00:00:00Z" },
];

function transactionsHandler(params: Record<string, unknown> | undefined) {
  if (params?.is_anomaly !== undefined) {
    const offset = (params.offset as number) ?? 0;
    return offset === 0
      ? { transactions: anomalyPage1, total: 60 }
      : { transactions: anomalyPage2, total: 60 };
  }
  if (params?.category === "Groceries") {
    return { transactions: groceriesTx, total: groceriesTx.length };
  }
  if (params?.category === "Income") {
    return { transactions: incomeTx, total: incomeTx.length };
  }
  return { transactions: [], total: 0 };
}

function mockAllEndpoints() {
  vi.mocked(client.get).mockImplementation((url, config) => {
    const params = config?.params as Record<string, unknown> | undefined;
    if (url === "/insights") {
      return Promise.resolve({ data: insightsMock });
    }
    if (url === "/forecast") {
      return Promise.resolve({ data: forecastFor(params?.category as string) });
    }
    if (url === "/transactions") {
      return Promise.resolve({ data: transactionsHandler(params) });
    }
    return Promise.reject(new Error(`unexpected url ${url}`));
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(client.get).mockReset();
  });

  it("loads and displays the summary, narration, and category cards, excluding unsupported categories", async () => {
    mockAllEndpoints();
    render(<Dashboard />);

    expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Summary text.")).toBeInTheDocument());

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("You spent nothing yet.")).toBeInTheDocument();

    const groceriesCard = screen.getByRole("button", { name: /Groceries/ });
    expect(within(groceriesCard).getByText("$50.00")).toBeInTheDocument();
    expect(within(groceriesCard).getByText("$150.00")).toBeInTheDocument();

    // Health has no forecast entry (Health/Transfer/Education are permanently
    // unsupported), so it should never render as a clickable card.
    expect(screen.queryByRole("button", { name: /Health/ })).not.toBeInTheDocument();

    // Income & Savings cards, computed from the current-month transaction sums.
    const incomeCard = screen.getByText("Income").closest("div") as HTMLElement;
    expect(within(incomeCard).getByText("$527.00")).toBeInTheDocument(); // 500 + 27
    expect(within(incomeCard).getByText("$800.00")).toBeInTheDocument(); // forecast

    const savingsCard = screen.getByText("Savings").closest("div") as HTMLElement;
    expect(within(savingsCard).getByText("$0.00")).toBeInTheDocument(); // no Savings tx mocked
  });

  it("shows an error if the insights fetch fails", async () => {
    vi.mocked(client.get).mockImplementation((url) => {
      if (url === "/insights") return Promise.reject(new Error("fail"));
      return Promise.resolve({ data: { transactions: [], total: 0 } });
    });
    render(<Dashboard />);

    await waitFor(() =>
      expect(screen.getByText("Couldn't load your dashboard.")).toBeInTheDocument()
    );
  });

  it("opens the forecast overlay for a clicked category and loads its current-month transactions", async () => {
    mockAllEndpoints();
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText("Summary text.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Groceries/ }));

    const dialog = screen.getByRole("dialog", { name: "Groceries" });
    expect(dialog).toBeInTheDocument();

    await waitFor(() => expect(within(dialog).getByText("Corner Store")).toBeInTheDocument());

    const calls = vi.mocked(client.get).mock.calls.filter(([url]) => url === "/transactions");
    const overlayCall = calls.find(([, config]) => {
      const params = config?.params as Record<string, unknown> | undefined;
      return params?.category === "Groceries" && params?.start_date;
    });
    expect(overlayCall).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Groceries" })).not.toBeInTheDocument();
  });

  it("opens the anomaly overlay, shows all-time anomalies, and paginates", async () => {
    mockAllEndpoints();
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText("Summary text.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Anomalies flagged/ }));

    const dialog = screen.getByRole("dialog", { name: "Flagged Anomalies" });
    await waitFor(() => expect(within(dialog).getByText("Odd Charge")).toBeInTheDocument());
    expect(within(dialog).getByText("Page 1 of 2")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(within(dialog).getByText("Another Odd Charge")).toBeInTheDocument()
    );
    expect(within(dialog).getByText("Page 2 of 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Flagged Anomalies" })).not.toBeInTheDocument();
  });
});