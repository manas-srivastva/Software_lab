import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const getRoleDashboard = (role) =>
  role === 'admin' || role === 'receptionist'
    ? '/staff/queue'
    : role === 'doctor'
      ? '/doctor/dashboard'
      : '/dashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Verifying security clearances...</p>
      </div>
    );
  }

  // Not logged in -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role restriction check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRoleDashboard(user?.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
