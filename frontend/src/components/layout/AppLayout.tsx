import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

interface NavItem {
  label: string;
  path: string;
  icon: (active: boolean) => ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: (active) => (
      <svg
        className={`w-5 h-5 ${active ? "text-emerald-400" : "text-slate-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 00-1 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    label: "Accounts",
    path: "/accounts",
    icon: (active) => (
      <svg
        className={`w-5 h-5 ${active ? "text-emerald-400" : "text-slate-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    label: "Transactions",
    path: "/transactions",
    icon: (active) => (
      <svg
        className={`w-5 h-5 ${active ? "text-emerald-400" : "text-slate-400"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
];

interface AppLayoutProps {
  children?: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock scroll when mobile menu is open & listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };

    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const isPathActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-base">
            FS
          </div>
          <span className="font-semibold text-slate-100 tracking-tight text-lg">
            FinSight
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle Navigation Menu"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (Desktop Persistent / Mobile Drawer) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ease-in-out lg:transform-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg group-hover:bg-emerald-500/20 transition-colors">
              FS
            </div>
            <div>
              <span className="font-bold text-slate-100 text-lg tracking-tight block">
                FinSight
              </span>
              <span className="text-xs font-mono text-emerald-400/80 uppercase tracking-wider block -mt-1">
                v1.0 Pro
              </span>
            </div>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Main Navigation">
          <div className="px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const active = isPathActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  active
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {item.icon(active)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-300 flex-shrink-0">
                {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {user?.email || "Authenticated User"}
                </p>
                <p className="text-[10px] text-slate-500 truncate">Active Session</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}