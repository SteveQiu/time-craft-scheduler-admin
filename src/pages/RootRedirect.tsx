import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';

export function RootRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isOrganization, loading: rolesLoading } = useUserRoles();

  // Still loading auth or roles
  if (authLoading || rolesLoading) {
    return <div className="flex items-center justify-center h-screen bg-background text-foreground">Loading...</div>;
  }

  // Not authenticated - send to public browse page
  if (!user) {
    return <Navigate to="/browse" replace />;
  }

  // Organization user → dashboard
  if (isOrganization) {
    return <Navigate to="/dashboard" replace />;
  }

  // Regular user → profile
  return <Navigate to="/profile" replace />;
}
