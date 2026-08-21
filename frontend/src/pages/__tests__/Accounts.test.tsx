// pages/__tests__/Accounts.test.tsx
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Accounts, type Account } from "../Accounts";
import client from "../../api/client";

vi.mock("../../api/client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mirrors Accounts.tsx's own formatCurrency exactly, so assertions aren't
// hardcoding a literal currency string that could drift from the real
// Intl.NumberFormat output depending on the environment's ICU data.
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(amount);
}

function mockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    name: "RBC Chequing",
    account_type: "chequing",
    starting_balance: 1000,
    current_balance: 1234.56,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Accounts Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Safe default so tests that don't care about the list don't hit an
    // unconfigured mock; individual tests override with mockResolvedValueOnce.
    vi.mocked(client.get).mockResolvedValue({ data: [] } as any);
  });

  function renderComponent() {
    return render(
      <MemoryRouter>
        <Accounts />
      </MemoryRouter>
    );
  }

  it("shows a loading state, then the empty state when there are no accounts", async () => {
    renderComponent();

    expect(screen.getByText("Loading accounts...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No accounts registered")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /add your first account/i })
    ).toBeInTheDocument();
  });

  it("shows an error alert when accounts fail to load", async () => {
    vi.mocked(client.get).mockRejectedValueOnce(new Error("Network error"));

    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't load your accounts. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("renders the account list and portfolio metrics when accounts exist", async () => {
    const accounts = [
      mockAccount({ id: "acc-1", name: "RBC Chequing", current_balance: 1000 }),
      mockAccount({
        id: "acc-2",
        name: "RBC Credit Card",
        account_type: "credit_card",
        current_balance: -250.5,
      }),
    ];
    vi.mocked(client.get).mockResolvedValueOnce({ data: accounts } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("RBC Chequing")).toBeInTheDocument();
    });

    expect(screen.getByText("RBC Credit Card")).toBeInTheDocument();
    expect(screen.getByText("credit card")).toBeInTheDocument(); // "_" -> " ", no case change in DOM text

    // Metrics
    expect(screen.getByText("Total Portfolio Value")).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(1000 + -250.5))).toBeInTheDocument();
    expect(screen.getByText("Active Accounts")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Each row links to its own account detail page
    expect(screen.getByText("RBC Chequing").closest("a")).toHaveAttribute(
      "href",
      "/accounts/acc-1"
    );
  });

  it('opens the account form when "New account" is clicked', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("No accounts registered")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^new account$/i }));

    expect(screen.getByRole("heading", { name: /add new account/i })).toBeInTheDocument();
  });

  it("closes the account form when its own Cancel button is clicked", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("No accounts registered")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^new account$/i }));
    const form = screen.getByRole("heading", { name: /add new account/i }).closest("form")!;

    // Get all cancel buttons within the form and click the footer one
    const cancelButtons = within(form).getAllByRole("button", { name: /^cancel$/i });
    // Click the second cancel button (the one in the footer)
    fireEvent.click(cancelButtons[1]);

    expect(screen.queryByRole("heading", { name: /add new account/i })).not.toBeInTheDocument();
  });

  it("submitting the form opens a create-confirmation dialog without calling the API yet", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("No accounts registered")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^new account$/i }));
    const form = screen.getByRole("heading", { name: /add new account/i }).closest("form")!;

    fireEvent.change(within(form).getByLabelText(/account name/i), {
      target: { value: "New Savings" },
    });
    fireEvent.click(within(form).getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(
      within(screen.getByRole("dialog")).getByRole("heading", { name: /create new account/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/new savings/i)).toBeInTheDocument();
    expect(client.post).not.toHaveBeenCalled();
  });

  it("confirming account creation calls the API, refreshes the list, and closes the form", async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: {} } as any);
    vi.mocked(client.get).mockResolvedValueOnce({ data: [] } as any); // initial mount
    vi.mocked(client.get).mockResolvedValueOnce({
      data: [mockAccount({ name: "New Savings" })],
    } as any); // refetch after create

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("No accounts registered")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^new account$/i }));
    const form = screen.getByRole("heading", { name: /add new account/i }).closest("form")!;

    fireEvent.change(within(form).getByLabelText(/account name/i), {
      target: { value: "New Savings" },
    });
    fireEvent.click(within(form).getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /confirm & create/i })
    );

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith("/accounts", {
        name: "New Savings",
        account_type: "chequing",
        starting_balance: 0,
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: /add new account/i })).not.toBeInTheDocument();
    expect(client.get).toHaveBeenCalledTimes(2); // initial mount + post-create refetch
  });

  it("shows an error alert in the form if account creation fails", async () => {
    vi.mocked(client.post).mockRejectedValueOnce(new Error("Server error"));

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("No accounts registered")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^new account$/i }));
    const form = screen.getByRole("heading", { name: /add new account/i }).closest("form")!;

    fireEvent.change(within(form).getByLabelText(/account name/i), {
      target: { value: "New Savings" },
    });
    fireEvent.click(within(form).getByRole("button", { name: /^create account$/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /confirm & create/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't create the account. Please try again.")
      ).toBeInTheDocument();
    });
    // Form stays open so the user can fix/retry
    expect(screen.getByRole("heading", { name: /add new account/i })).toBeInTheDocument();
  });

  it("clicking an account row's delete button opens a delete-confirmation dialog", async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: [mockAccount({ name: "RBC Chequing" })],
    } as any);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("RBC Chequing")).toBeInTheDocument();
    });

    const row = screen.getByText("RBC Chequing").closest("li")!;
    fireEvent.click(within(row).getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("dialog")).getByRole("heading", { name: /delete account/i })
    ).toBeInTheDocument();
    // Scope the query to the dialog to avoid matching the account name in the list
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/rbc chequing/i, { selector: "p" })).toBeInTheDocument();
  });

  it("confirming deletion calls the API and refreshes the list", async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: [mockAccount({ id: "acc-1", name: "RBC Chequing" })],
    } as any); // initial mount
    vi.mocked(client.delete).mockResolvedValueOnce({ data: {} } as any);
    vi.mocked(client.get).mockResolvedValueOnce({ data: [] } as any); // refetch after delete

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("RBC Chequing")).toBeInTheDocument();
    });

    const row = screen.getByText("RBC Chequing").closest("li")!;
    fireEvent.click(within(row).getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /^delete account$/i })
    );

    await waitFor(() => {
      expect(client.delete).toHaveBeenCalledWith("/accounts/acc-1");
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(client.get).toHaveBeenCalledTimes(2); // initial mount + post-delete refetch
  });

  it("shows an error alert if deletion fails", async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      data: [mockAccount({ id: "acc-1", name: "RBC Chequing" })],
    } as any);
    vi.mocked(client.delete).mockRejectedValueOnce(new Error("Server error"));

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("RBC Chequing")).toBeInTheDocument();
    });

    const row = screen.getByText("RBC Chequing").closest("li")!;
    fireEvent.click(within(row).getByRole("button", { name: /delete account/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /^delete account$/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't delete the account. Please try again.")
      ).toBeInTheDocument();
    });
  });
});