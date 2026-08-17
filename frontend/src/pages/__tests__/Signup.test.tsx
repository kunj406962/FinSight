import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Signup } from "../Signup";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the PasswordStrengthMeter component
vi.mock("../../components/auth/PasswordStrengthMeter", () => ({
  PasswordStrengthMeter: () => <div data-testid="password-strength-meter" />,
}));

describe("Signup Page", () => {
  const mockSignup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      signup: mockSignup,
      login: vi.fn(),
      logout: vi.fn(),
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  });

  it("prevents submission if passwords do not match", async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText("name@company.com");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••••••");
    
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongP@ss123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "DifferentP@ss123" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Use getAllByText and check the first one (the Alert error)
      const errorMessages = screen.getAllByText(/passwords do not match/i);
      expect(errorMessages.length).toBeGreaterThan(0);
      expect(mockSignup).not.toHaveBeenCalled();
    });
  });

  it("prevents submission if password doesn't meet requirements", async () => {
    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText("name@company.com");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••••••");
    
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "weak" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/password does not meet the minimum security requirements/i)
      ).toBeInTheDocument();
      expect(mockSignup).not.toHaveBeenCalled();
    });
  });

  it("submits successfully and redirects to login with confirmation message", async () => {
    mockSignup.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText("name@company.com");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••••••");
    
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    fireEvent.change(emailInput, { target: { value: "new@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongP@ss123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "StrongP@ss123" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith("new@example.com", "StrongP@ss123");
      expect(mockNavigate).toHaveBeenCalledWith("/login", {
        state: {
          message:
            "Account created successfully! Please check your inbox and click the confirmation link before logging in.",
        },
      });
    });
  });

  it("displays error when signup fails", async () => {
    mockSignup.mockRejectedValueOnce(new Error("Email already in use"));

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText("name@company.com");
    const passwordInputs = screen.getAllByPlaceholderText("••••••••••••");
    
    const passwordInput = passwordInputs[0];
    const confirmPasswordInput = passwordInputs[1];

    fireEvent.change(emailInput, { target: { value: "existing@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongP@ss123" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "StrongP@ss123" } });

    const submitButton = screen.getByRole("button", { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/signup failed\. that email may already be in use\./i)
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});