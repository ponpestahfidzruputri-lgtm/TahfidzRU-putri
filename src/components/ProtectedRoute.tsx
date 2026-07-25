import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: ('admin' | 'pengurus' | 'pengajar' | 'wali')[];
}

const roleHome: Record<'admin' | 'pengurus' | 'pengajar' | 'wali', string> = {
  admin: '/admin',
  pengurus: '/pengurus',
  pengajar: '/pengajar',
  wali: '/wali',
};

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  const waitingForRole = Boolean(user && allowedRoles && !role);

  if (loading || waitingForRole) {
    return (
      <div className="flex bg-slate-50 items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={roleHome[role]} replace />;
  }

  if (allowedRoles && !role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
