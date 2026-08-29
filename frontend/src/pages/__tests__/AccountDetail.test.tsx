import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AccountDetail } from "../AccountDetail";
import client from "../../api/client";
import type { AxiosRequestConfig } from "axios";

// Mock react-router-dom to provide the accountId param
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ accountId: "acc-123" }),
  };
});

// Mock the API client
vi.mock("../../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockAccount = {
  id: "acc-123",
  user_id: "user-1",
  name: "Main Checking",
  account_type: "Checking",
  starting_balance: 1000,
  current_balance: 1250.5,
  created_at: "2026-08-01T00:00:00Z",
};

const mockTransactions = [
  {
    id: "txn-1",
    user_id: "user-1",
    batch_id: "batch-1",
    account_id: "acc-123",
    date: "2026-08-15",
    description: "Grocery Store",
    amount: -150.0,
    category: "Groceries",
    account_type: "Checking",
    is_anomaly: false,
    anomaly_score: 0,
    created_at: "2026-08-16T00:00:00Z",
  },
  {
    id: "txn-2",
    user_id: "user-1",
    batch_id: "batch-1",
    account_id: "acc-123",
    date: "2026-08-16",
    description: "Salary Deposit",
    amount: 3000.0,
    category: "Income",
    account_type: "Checking",
    is_anomaly: false,
    anomaly_score: 0,
    created_at: "2026-08-16T00:00:00Z",
  },
];

const mockReconciliations = [
  {
    id: "rec-1",
    account_id: "acc-123",
    reconciled_balance: 1250.5,
    reconciled_at: "2026-08-20",
    created_at: "2026-08-20T00:00:00Z",
  },
];

describe("AccountDetail Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful API routing mock
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === "/accounts") {
        return Promise.resolve({ data: [mockAccount] });
      }
      if (url === "/transactions") {
        return Promise.resolve({
          data: { transactions: mockTransactions, total: mockTransactions.length },
        });
      }
      if (url.includes("/reconciliations")) {
        return Promise.resolve({ data: mockReconciliations });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AccountDetail />
      </MemoryRouter>
    );
  };

  it("renders loading states initially, then populates account and transaction data", async () => {
    renderComponent();

    // Check initial loading states
    expect(screen.getByText(/loading account/i)).toBeInTheDocument();

    // Wait for the data to resolve and layout to render
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Main Checking" })).toBeInTheDocument();
    });

    // Check account details
    expect(screen.getByText(/checking · starting balance/i)).toBeInTheDocument();
    expect(screen.getByTestId("current-balance")).toHaveTextContent("$1,250.50");

    // Check transactions
    expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    expect(screen.getByText("Salary Deposit")).toBeInTheDocument();
    
    // Check reconciliations
    expect(screen.getByText("2026-08-20")).toBeInTheDocument();
  });

  it("re-fetches transactions from the server after a debounced search input", async () => {
    // Search is now server-side (GET /transactions?search=...), not an
    // in-memory filter -- the mock has to branch on the request's search
    // param and return a different page for it, and the assertion has to
    // wait out the ~400ms debounce before the filtered request fires.
    vi.mocked(client.get).mockImplementation(
      (url: string, config?: AxiosRequestConfig)  => {
        if (url === "/accounts") {
          return Promise.resolve({ data: [mockAccount] });
        }
        if (url === "/transactions") {
          if (config?.params?.search === "salary") {
            return Promise.resolve({
              data: { transactions: [mockTransactions[1]], total: 1 },
            });
          }
          return Promise.resolve({
            data: { transactions: mockTransactions, total: mockTransactions.length },
          });
        }
        if (url.includes("/reconciliations")) {
          return Promise.resolve({ data: mockReconciliations });
        }
        return Promise.reject(new Error("Not found"));
      }
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Grocery Store")).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search transactions/i);
    fireEvent.change(searchInput, { target: { value: "salary" } });

    // Debounced -- the filtered request only fires ~400ms after typing
    // stops, so give waitFor enough headroom to catch it.
    await waitFor(
      () => {
        expect(screen.queryByText("Grocery Store")).not.toBeInTheDocument();
        expect(screen.getByText("Salary Deposit")).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("displays error alert if account fetch fails", async () => {
    vi.mocked(client.get).mockImplementation((url: string) => {
      if (url === "/accounts") return Promise.reject(new Error("Network Error"));
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Couldn't load this account.")).toBeInTheDocument();
    });
  });

  it("successfully records a reconciliation using the confirmation dialog", async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: {} });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Main Checking" })).toBeInTheDocument();
    });

    // Fill out reconciliation form
    const balanceInput = screen.getByLabelText(/reconciled balance/i);
    fireEvent.change(balanceInput, { target: { value: "1300.00" } });

    // Click Record Reconciliation (Form level)
    const recordBtn = screen.getByRole("button", { name: "Record Reconciliation" });
    fireEvent.click(recordBtn);

    // Modal should appear
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Scope query to the modal to avoid matching form buttons
    const confirmDialogBtn = within(dialog).getByRole("button", { name: "Record" });
    fireEvent.click(confirmDialogBtn);

    // Verify API call and modal closure
    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith("/accounts/acc-123/reconciliations", {
        reconciled_balance: 1300,
        reconciled_at: expect.any(String),
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("allows discarding an upload preview via the confirmation dialog", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Main Checking" })).toBeInTheDocument();
    });

    // We simulate the UI state being in "preview mode" by manually mocking the state 
    // or triggering the file upload. 
    // Triggering file input change:
   const fileInput = screen.getByLabelText(/upload statement/i, { selector: "input[type='file']" });

    const file = new File(["dummy,csv,content"], "statement.csv", { type: "text/csv" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Mock the post request for preview
    vi.mocked(client.post).mockResolvedValueOnce({
      data: {
        account_id: "acc-123",
        filename: "statement.csv",
        bank_detected: "Generic",
        transactions: [
          { date: "2026-08-23", description: "Coffee", amount: -5, predicted_category: "Food" }
        ]
      }
    });

    const previewBtn = screen.getByRole("button", { name: "Preview Upload" });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByText("statement.csv — 1 transactions")).toBeInTheDocument();
    });

    // Click discard on the preview UI
    const discardBtn = screen.getByRole("button", { name: "Discard" });
    fireEvent.click(discardBtn);

    // Modal appears, click discard in the dialog
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Discard Preview" })).toBeInTheDocument();

    const dialogDiscardBtn = within(dialog).getByRole("button", { name: "Discard" });
    fireEvent.click(dialogDiscardBtn);

    // Ensure it goes back to the initial upload state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Preview Upload" })).toBeInTheDocument();
      expect(screen.queryByText("statement.csv — 1 transactions")).not.toBeInTheDocument();
    });
  });
});