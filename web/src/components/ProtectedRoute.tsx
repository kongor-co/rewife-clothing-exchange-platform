import { Navigate, Outlet } from "react-router-dom";
import { AccountRequired } from "./AccountRequired";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="page-state">Checking your session...</div>;
  }
  if (!user) {
    return <AccountRequired />;
  }
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }
  return <Outlet />;
}
