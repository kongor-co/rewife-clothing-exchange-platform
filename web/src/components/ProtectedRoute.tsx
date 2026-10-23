import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AccountRequired } from "./AccountRequired";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading, memberReady, memberError } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="page-state">Checking your session...</div>;
  }
  if (!user) {
    return <AccountRequired />;
  }
  if (!user.emailVerified) {
    return location.pathname === "/profile" ? <Outlet /> : <Navigate to="/profile" replace />;
  }
  if (memberError) {
    return <div className="page-state"><p className="alert alert-error">{memberError}</p></div>;
  }
  if (!memberReady) {
    return <div className="page-state">Preparing your account...</div>;
  }
  return <Outlet />;
}
