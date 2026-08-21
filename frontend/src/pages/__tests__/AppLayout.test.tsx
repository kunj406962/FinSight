import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppLayout } from "../../components/layout/AppLayout";
import { useAuth } from "../../context/useAuth";

vi.mock("../../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

describe("AppLayout Component", () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      user: { id: "123", email: "alex@finsight.io" },
      logout: mockLogout,
    } as any);
  });

  const renderLayout = (initialPath = "/") => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AppLayout>
          <div>Dashboard Content Payload</div>
        </AppLayout>
      </MemoryRouter>
    );
  };

  it("renders branding, active navigation links, and content slot", () => {
    renderLayout("/");

    expect(screen.getAllByText("FinSight")[0]).toBeInTheDocument();
    expect(screen.getByText("Dashboard Content Payload")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /accounts/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /transactions/i })).toBeInTheDocument();
  });

  it("displays the user's email and triggers logout when clicked", () => {
    renderLayout("/");

    expect(screen.getByText("alex@finsight.io")).toBeInTheDocument();
    
    const logoutBtn = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("opens and closes the mobile drawer when toggling the hamburger button", () => {
    renderLayout("/");

    const toggleBtn = screen.getByRole("button", { name: /toggle navigation menu/i });
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
  });
});