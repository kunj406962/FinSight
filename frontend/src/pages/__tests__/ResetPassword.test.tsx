import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ResetPassword } from "../ResetPassword";
import { supabase } from "../../api/supabaseClient";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../../api/supabaseClient", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe("ResetPassword Component", () => {
  let authStateCallback: ((event: string, session?: any) => void) | null = null;
  const mockUnsubscribe = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockNavigate.mockClear();
    authStateCallback = null;

    (supabase.auth.onAuthStateChange as any).mockImplementation((cb: (event: string, session?: any) => void) => {
      authStateCallback = cb;
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
    });

    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

  it("renders verifying state initially", () => {
    renderComponent();
    expect(screen.getByText("Verifying security token...")).toBeInTheDocument();
    expect(
      screen.getByText("Authenticating your password reset request with FinSight")
    ).toBeInTheDocument();
  });

  it("shows invalid link state if session verification times out", async () => {
    renderComponent();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText("Link invalid or expired")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Password reset links expire quickly for security reasons. Please request a new link to proceed."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /request new reset link/i })
    ).toBeInTheDocument();
  }, 10000);

  it("renders reset form when getSession resolves with a session", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: "123" } } },
    });

    renderComponent();

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  }, 10000);

  it("renders reset form when PASSWORD_RECOVERY event is triggered", async () => {
    renderComponent();

    act(() => {
      if (authStateCallback) {
        authStateCallback("PASSWORD_RECOVERY", { user: { id: "123" } });
      }
      vi.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    });
  }, 10000);

  it("displays validation error when passwords do not match", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: "123" } } },
    });

    renderComponent();

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText(/^new password$/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

    fireEvent.change(passwordInput, { target: { value: "Secret123!" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "Different123!" } });

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /update password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Passwords do not match. Please verify both fields.")
      ).toBeInTheDocument();
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });
  }, 10000);

  it("handles successful password reset submission", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: "123" } } },
    });
    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });

    renderComponent();

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "NewSecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "NewSecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "NewSecurePass123!" });
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login", {
        state: {
          message: "Password updated successfully. Please log in with your new password.",
        },
      });
    });
  }, 10000);

  it("handles API error during password update", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: "123" } } },
    });
    (supabase.auth.updateUser as any).mockResolvedValue({
      error: new Error("Auth error"),
    });

    renderComponent();

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "NewSecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "NewSecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /couldn't reset your password\. the link may have expired — please request a new one\./i
        )
      ).toBeInTheDocument();
    });
  }, 10000);

  it("cleans up subscriptions and timeouts on unmount", () => {
    const { unmount } = renderComponent();
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("handles getSession failure gracefully", async () => {
    (supabase.auth.getSession as any).mockRejectedValue(new Error("Network error"));

    renderComponent();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.getByText("Link invalid or expired")).toBeInTheDocument();
    });
  }, 10000);

  it("handles signOut failure during password reset", async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: "123" } } },
    });
    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });
    (supabase.auth.signOut as any).mockRejectedValue(new Error("Sign out failed"));

    renderComponent();

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "NewSecurePass123!" },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: "NewSecurePass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/login", {
        state: {
          message: "Password updated successfully. Please log in with your new password.",
        },
      });
    });
  }, 10000);
});