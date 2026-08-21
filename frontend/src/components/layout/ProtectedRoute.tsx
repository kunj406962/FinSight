import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { AppLayout } from "./AppLayout";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}