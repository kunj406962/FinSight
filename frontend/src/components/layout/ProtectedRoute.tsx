import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { AppLayout } from "./AppLayout";
import { isDemoMode } from "../../demo/demoState";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated && !isDemoMode()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}