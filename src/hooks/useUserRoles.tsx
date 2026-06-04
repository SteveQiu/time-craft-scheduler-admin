import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'USER' | 'ORGANIZATION' | 'INTERNAL_DEV';

export function useUserRoles() {
  const { user } = useAuth();

  const { data: roles = [], isLoading: loading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }

      return (data?.map(r => r.role as AppRole) || []);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,  // roles rarely change; revalidated by RealtimeInvalidator
  });

  const hasRole = (role: AppRole) => roles.includes(role);
  const isUser = hasRole('USER');
  const isOrganization = hasRole('ORGANIZATION');
  const isInternalDev = hasRole('INTERNAL_DEV');

  return {
    roles,
    loading,
    hasRole,
    isUser,
    isOrganization,
    isInternalDev,
  };
}