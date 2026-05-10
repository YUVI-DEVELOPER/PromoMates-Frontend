import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { AccessDenied } from "../pages/AccessDenied";
import { PERMISSIONS } from "../utils/permissions";


type AdminRouteProps = {
  children: ReactNode;
};


export function AdminRoute({ children }: AdminRouteProps) {
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

  if (!hasAnyPermission([
    PERMISSIONS.MANAGE_SYSTEM,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_MASTER_DATA,
  ])) {
    return <AccessDenied />;
  }

  return children;
}
