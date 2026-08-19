import { useState, type ReactNode } from "react";
import client from "../api/client";
import { setToken, clearToken } from "../api/authToken";
import { AuthContext, type AuthUser } from "./auth-context-value";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function login(email: string, password: string): Promise<void> {
    const response = await client.post("/auth/login", { email, password });
    setToken(response.data.access_token);
    setUser({ email });
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
      setUser(null);
      setIsAuthenticated(false);
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}