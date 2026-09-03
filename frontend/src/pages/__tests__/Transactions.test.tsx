import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Transactions } from "../Transactions";
import client from "../../api/client";

// Mock the API client
vi.mock("../../api/client", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockAccounts = [
  {
    id: "acc-1",
    user_id: "user-1",
    name: "Main Checking",
    account_type: "chequing",
    starting_balance: 0,
    current_balance: 500,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-2",
    user_id: "user-1",
    name: "Travel Card",
    account_type: "credit_card",
    starting_balance: 0,
    current_balance: -200,
    created_at: "2026-01-01T00:00:00Z",
  },
];

const groceryTxn = {
  id: "txn-1",
  user_id: "user-1",
  batch_id: "batch-1",
  account_id: "acc-1",
  date: "2026-08-15",
  description: "Grocery Store",
  amount: -150.0,
  category: "Groceries",
  account_type: "chequing",
  is_anomaly: false,
  anomaly_score: 0.1,
  created_at: "2026-08-16T00:00:00Z",
};

const flightTxn = {
  id: "txn-2",
  user_id: "user-1",
  batch_id: "batch-2",
  account_id: "acc-2",
  date: "2026-08-10",
  description: "Flight to Denver",
  amount: -420.0,
  category: "Transport",
  account_type: "credit_card",
  is_anomaly: false,
  anomaly_score: 0.2,
  created_at: "2026-08-11T00:00:00Z",
};

const mockTransactions = [groceryTxn, flightTxn];

const renderPage = () =>
  render(
    <MemoryRouter>
      <Transactions />
    </MemoryRouter>
  );

describe("Transactions Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(client.get).mockImplementation((url) => {
      if (url === "/accounts") {
        return Promise.resolve({ data: mockAccounts });
      }
      if (url === "/transactions") {
        return Promise.resolve({
          data: { transactions: mockTransactions, total: mockTransactions.length },
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("renders a loading state, then populates transactions with their account names", async () => {
    renderPage();

    expect(screen.getByText(/loading transactions/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Transactions" })).toBeInTheDocument();
    expect(screen.getByText("Flight to Denver")).toBeInTheDocument();

    // "Main Checking" appears twice by design: once as a <select> option in
    // the account filter, once as the account-name badge on Grocery Store's
    // row -- assert both are present rather than a single unique match.
    expect(screen.getAllByText("Main Checking")).toHaveLength(2);
    expect(screen.getAllByText("Travel Card")).toHaveLength(2);
  });

  it("shows an alert if accounts fail to load, but still renders transactions", async () => {
    vi.mocked(client.get).mockImplementation((url) => {
      if (url === "/accounts") return Promise.reject(new Error("Network Error"));
      if (url === "/transactions") {
        return Promise.resolve({
          data: { transactions: mockTransactions, total: mockTransactions.length },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Couldn't load your accounts.")).toBeInTheDocument();
    });
    expect(screen.getByText("Grocery Store")).toBeInTheDocument();
  });

  it("shows an alert if transactions fail to load", async () => {
    vi.mocked(client.get).mockImplementation((url) => {
      if (url === "/accounts") return Promise.resolve({ data: mockAccounts });
      if (url === "/transactions") return Promise.reject(new Error("Network Error"));
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Couldn't load transactions.")).toBeInTheDocument();
    });
  });

  it("shows an empty state when no transactions match the current filters", async () => {
    vi.mocked(client.get).mockImplementation((url) => {
      if (url === "/accounts") return Promise.resolve({ data: mockAccounts });
      if (url === "/transactions") return Promise.resolve({ data: { transactions: [], total: 0 } });
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No transactions found")).toBeInTheDocument();
    });
  });

  it("filters by account via the account dropdown, sending account_id to the server", async () => {
    vi.mocked(client.get).mockImplementation((url, config) => {
      const params = config?.params as Record<string, unknown> | undefined;
      if (url === "/accounts") return Promise.resolve({ data: mockAccounts });
      if (url === "/transactions") {
        if (params?.account_id === "acc-2") {
          return Promise.resolve({ data: { transactions: [flightTxn], total: 1 } });
        }
        return Promise.resolve({
          data: { transactions: mockTransactions, total: mockTransactions.length },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "acc-2" } });

    await waitFor(() => {
      expect(screen.queryByText("Grocery Store")).not.toBeInTheDocument();
      expect(screen.getByText("Flight to Denver")).toBeInTheDocument();
    });
  });

  it("filters by category via the category dropdown, sending category to the server", async () => {
    vi.mocked(client.get).mockImplementation((url, config) => {
      const params = config?.params as Record<string, unknown> | undefined;
      if (url === "/accounts") return Promise.resolve({ data: mockAccounts });
      if (url === "/transactions") {
        if (params?.category === "Transport") {
          return Promise.resolve({ data: { transactions: [flightTxn], total: 1 } });
        }
        return Promise.resolve({
          data: { transactions: mockTransactions, total: mockTransactions.length },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Transport" } });

    await waitFor(() => {
      expect(screen.queryByText("Grocery Store")).not.toBeInTheDocument();
      expect(screen.getByText("Flight to Denver")).toBeInTheDocument();
    });
  });

  it("re-fetches transactions from the server after a debounced search input", async () => {
    vi.mocked(client.get).mockImplementation((url, config) => {
      const params = config?.params as Record<string, unknown> | undefined;
      if (url === "/accounts") return Promise.resolve({ data: mockAccounts });
      if (url === "/transactions") {
        if (params?.search === "flight") {
          return Promise.resolve({ data: { transactions: [flightTxn], total: 1 } });
        }
        return Promise.resolve({
          data: { transactions: mockTransactions, total: mockTransactions.length },
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/search transactions/i), {
      target: { value: "flight" },
    });

    // Debounced -- the filtered request only fires ~400ms after typing stops.
    await waitFor(
      () => {
        expect(screen.queryByText("Grocery Store")).not.toBeInTheDocument();
        expect(screen.getByText("Flight to Denver")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("paginates via Previous/Next, sending the correct offset and disabling at the edges", async () => {
    const page1Txn = { ...groceryTxn };
    const page2Txn = { ...flightTxn, id: "txn-page2", description: "Page 2 Item" };

    vi.mocked(client.get).mockImplementation((url, config) => {
      const params = config?.params as Record<string, unknown> | undefined;
      if (url === "/accounts") return Promise.resolve({ data: mockAccounts });
      if (url === "/transactions") {
        const offset = params?.offset ?? 0;
        if (offset === 50) {
          return Promise.resolve({ data: { transactions: [page2Txn], total: 120 } });
        }
        return Promise.resolve({ data: { transactions: [page1Txn], total: 120 } });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    });

    expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Page 2 Item")).toBeInTheDocument();
    });
    expect(screen.getByText(/page 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });

  it("resets to page 1 when a filter changes after paginating forward", async () => {
    const page1Txn = { ...groceryTxn };
    const page2Txn = { ...flightTxn, id: "txn-page2", description: "Page 2 Item" };
    const filteredTxn = { ...flightTxn, id: "txn-filtered", description: "Filtered Item" };

    vi.mocked(client.get).mockImplementation((url, config) => {
      const params = (config?.params ?? {}) as Record<string, unknown>;
      if (url === "/accounts") return Promise.resolve({ data: mockAccounts });
      if (url === "/transactions") {
        if (params.category === "Transport") {
          return Promise.resolve({ data: { transactions: [filteredTxn], total: 1 } });
        }
        if (params.offset === 50) {
          return Promise.resolve({ data: { transactions: [page2Txn], total: 120 } });
        }
        return Promise.resolve({ data: { transactions: [page1Txn], total: 120 } });
      }
      return Promise.reject(new Error("Not found"));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Page 2 Item")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Transport" } });

    await waitFor(() => {
      expect(screen.getByText("Filtered Item")).toBeInTheDocument();
    });
    expect(screen.getByText(/page 1 of 1/i)).toBeInTheDocument();
  });
});