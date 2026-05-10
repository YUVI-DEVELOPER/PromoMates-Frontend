import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { AccessDenied } from "../pages/AccessDenied";


type ProtectedRouteProps = {
  children: ReactNode;
  requireAnyPermission?: readonly string[];
};


export function ProtectedRoute({ children, requireAnyPermission }: ProtectedRouteProps) {
  const { hasAnyPermission, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm font-medium text-slate-600">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAnyPermission && !hasAnyPermission([...requireAnyPermission])) {
    return <AccessDenied />;
  }

  return children;
}
