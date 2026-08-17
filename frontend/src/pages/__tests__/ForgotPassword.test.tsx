import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ForgotPassword } from "../ForgotPassword";
import { supabase } from "../../api/supabaseClient";

// Mock Supabase Client
vi.mock("../../api/supabaseClient", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

describe("ForgotPassword Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderComponent() {
    return render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
  }

  it("renders the initial request form correctly", () => {
    renderComponent();

    // Check header title & subtitle from AuthLayout
    expect(screen.getByRole("heading", { name: /reset your password/i })).toBeInTheDocument();

    // Check input field and helper hint
    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toBeInTheDocument();
    expect(
      screen.getByText(/we'll send a secure, single-use link/i)
    ).toBeInTheDocument();

    // Check submit button
    const submitButton = screen.getByRole("button", { name: /send recovery link/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled(); // Disabled when email is empty

    // Check navigation link
    expect(screen.getByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("enables the submit button when valid text is typed into the email input", () => {
    renderComponent();

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", { name: /send recovery link/i });

    expect(submitButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    expect(submitButton).not.toBeDisabled();
  });

  it("calls supabase.auth.resetPasswordForEmail with correct email and redirect URL on form submission", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: { message_id: "123" },
      error: null,
    });

    renderComponent();

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    const submitButton = screen.getByRole("button", { name: /send recovery link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        { redirectTo: `${window.location.origin}/reset-password` }
      );
    });
  });

  it("displays success message state when password reset request succeeds", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: { message_id: "123" },
      error: null,
    });

    renderComponent();

    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: "alex@example.com" } });

    fireEvent.click(screen.getByRole("button", { name: /send recovery link/i }));

    // Wait for success screen UI to render
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/we sent a password recovery link to/i)).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();

    // Secondary reset option should be available
    expect(
      screen.getByRole("button", { name: /re-enter email address/i })
    ).toBeInTheDocument();
  });

  it("allows user to reset and re-enter email from success screen", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: { message_id: "123" },
      error: null,
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "alex@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
    });

    // Click "Re-enter email address"
    const reenterButton = screen.getByRole("button", { name: /re-enter email address/i });
    fireEvent.click(reenterButton);

    // Should return to original form screen
    expect(screen.getByRole("heading", { name: /reset your password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue("alex@example.com");
  });

  it("renders error Alert when Supabase request fails", async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: null,
      error: { name: "AuthError", status: 400, message: "User not found" } as any,
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "nonexistent@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("shows loading indicator on button during submission", async () => {
    // Return a promise that doesn't resolve immediately
    vi.mocked(supabase.auth.resetPasswordForEmail).mockReturnValueOnce(
      new Promise(() => {})
    );

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "user@example.com" },
    });
    
    const submitButton = screen.getByRole("button", { name: /send recovery link/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});