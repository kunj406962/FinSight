import { createContext, useContext, useState, type ReactNode } from "react";
import client from "../api/client";
import { setToken, clearToken } from "../api/authToken";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  async function login(email: string, password: string): Promise<void> {
    const response = await client.post("/auth/login", { email, password });
    setToken(response.data.access_token);
    setIsAuthenticated(true);
  }

  async function signup(email: string, password: string): Promise<void> {
    await client.post("/auth/signup", { email, password });
  }

  async function logout(): Promise<void> {
    try {
      await client.post("/auth/logout");
    } finally {
      clearToken();
      setIsAuthenticated(false);
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}