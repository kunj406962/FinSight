import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ResendConfirmation } from "../ResendConfirmation";
import client from "../../api/client";

// Mock the API client
vi.mock("../../api/client", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("ResendConfirmation Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ResendConfirmation />
      </MemoryRouter>
    );
  };

  it("renders initial form with expected layout and controls", () => {
    renderComponent();

    // Check heading and subtext
    expect(
      screen.getByRole("heading", { name: /resend confirmation email/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/enter your email address to receive a new confirmation link/i)
    ).toBeInTheDocument();

    // Check email field and submit button
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");

    const submitButton = screen.getByRole("button", { name: /resend email/i });
    expect(submitButton).toBeInTheDocument();
    // Submit button should be disabled initially when input is empty
    expect(submitButton).toBeDisabled();

    // Navigation link back to login
    const loginLink = screen.getByRole("link", { name: /back to login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("enables the submit button when valid email is entered", () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /resend email/i });

    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    expect(submitButton).toBeEnabled();
  });

  it("submits form successfully and displays confirmation state", async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: { message: "Confirmation sent" } });

    renderComponent();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", { name: /resend email/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    // Verify API payload
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith("/auth/resend-confirmation", {
      email: "test@example.com",
    });

    // Verify sent/confirmation UI state
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    });

    expect(
      screen.getByText(/if that account needs confirmation, a new email is on its way/i)
    ).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();

    // Options available on success screen
    expect(
      screen.getByRole("button", { name: /re-enter email address/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to login/i })).toBeInTheDocument();
  });

  it("allows user to reset state and retry from confirmation view", async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: {} });

    renderComponent();

    // Submit form first
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "user@domain.com" } });
    fireEvent.click(screen.getByRole("button", { name: /resend email/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    });

    // Click "Re-enter email address" button
    const reEnterBtn = screen.getByRole("button", { name: /re-enter email address/i });
    fireEvent.click(reEnterBtn);

    // Should return to the form with email value preserved
    expect(
      screen.getByRole("heading", { name: /resend confirmation email/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveValue("user@domain.com");
  });

  it("displays error alert on API request failure", async () => {
    vi.mocked(client.post).mockRejectedValueOnce(new Error("Network Error"));

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "error@test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /resend email/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeInTheDocument();
    });

    // Form should remain visible so the user can fix/retry
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});