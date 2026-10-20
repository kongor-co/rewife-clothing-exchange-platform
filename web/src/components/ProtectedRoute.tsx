import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="page-state">Checking your session...</div>;
  }
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  return <Outlet />;
}
