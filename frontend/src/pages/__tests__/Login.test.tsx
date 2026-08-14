import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Login } from "../Login";
import { useAuth } from "../../context/AuthContext";

// Mock the AuthContext properly
vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
const mockLocationState = { state: null };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocationState,
  };
});

describe("Login Page", () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocationState.state = null;
    
    // Provide a complete mock of useAuth
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      signup: vi.fn(),
      logout: vi.fn(),
      user: null,
      isAuthenticated: false,
      loading: false,
    } as any);
  });

  it("renders form elements correctly", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", {
        name: /sign in to finsight/i,
      })
    ).toBeInTheDocument();

    // Use getByLabelText with more specific matching
    expect(
      screen.getByLabelText(/email address/i)
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/^password$/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /sign in/i,
      })
    ).toBeInTheDocument();
  });

  it("calls login and navigates on successful form submit", async () => {
    mockLogin.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, {
      target: { value: "user@example.com" },
    });

    fireEvent.change(passwordInput, {
      target: { value: "password123" },
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith(
        "user@example.com",
        "password123"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("displays an error message when login fails", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/^password$/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, {
      target: { value: "wrong@example.com" },
    });

    fireEvent.change(passwordInput, {
      target: { value: "wrongpass" },
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/login failed\. check your email and password\./i)
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("displays success message when present in location state", () => {
    // Set the location state before rendering
    mockLocationState.state = { 
      message: "Account created successfully! Please check your inbox and click the confirmation link before logging in." 
    };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // The success message should be rendered by the Alert component
    expect(
      screen.getByText(/account created successfully!/i)
    ).toBeInTheDocument();
  });
});