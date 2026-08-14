import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { ROUTES } from '@/config/routes';

export function RootRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isOrganization, loading: rolesLoading } = useUserRoles();

  if (authLoading || rolesLoading) {
    return <div className="flex items-center justify-center h-screen bg-background text-foreground">Loading...</div>;
  }

  // Unauthenticated at '/' is handled by AppContent (renders LandingPage before reaching here).
  // This is a safety fallback only.
  if (!user) {
    return <Navigate to={ROUTES.browse} replace />;
  }

  if (isOrganization) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Navigate to={ROUTES.profile} replace />;
}
