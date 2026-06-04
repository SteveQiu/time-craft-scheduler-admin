import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Resource {
  id: string;
  user_id: string;
  name: string;
  hourly_rate: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export function useResources() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const addResource = useMutation({
    mutationFn: async (resource: { name: string; hourly_rate?: number | null; metadata?: Record<string, any> }) => {
      const { error } = await supabase
        .from('resources')
        .insert({
          user_id: user!.id,
          name: resource.name,
          hourly_rate: resource.hourly_rate ?? null,
          metadata: resource.metadata ?? {},
        } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Resource> & { id: string }) => {
      const { error } = await supabase
        .from('resources')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });

  const getResourceByName = (name: string) => resources.find(r => r.name === name);

  return {
    resources,
    isLoading,
    addResource,
    updateResource,
    deleteResource,
    getResourceByName,
  };
}
