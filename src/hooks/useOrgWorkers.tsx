import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface OrgWorker {
  id: string;
  org_id: string;
  worker_email: string;
  worker_name: string;
  phone: string | null;
  skills: string[];
  hourly_rate: number;
  status: 'invited' | 'accepted' | 'declined';
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrgWorkers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['org-workers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_workers')
        .select('*')
        .eq('org_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as OrgWorker[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const inviteWorker = useMutation({
    mutationFn: async (worker: { worker_email: string; worker_name: string; phone?: string; skills: string[]; hourly_rate: number }) => {
      const { error } = await supabase
        .from('org_workers')
        .insert({
          org_id: user!.id,
          ...worker,
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-workers'] }),
  });

  const updateWorker = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrgWorker> & { id: string }) => {
      const { error } = await supabase
        .from('org_workers')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-workers'] }),
  });

  const deleteWorker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('org_workers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-workers'] }),
  });

  const acceptedWorkers = useMemo(
    () => workers.filter(w => w.status === 'accepted'),
    [workers]
  );
  const getWorkerByName = (name: string) => workers.find(w => w.worker_name === name);
  const getWorkerRate = (name: string) => getWorkerByName(name)?.hourly_rate ?? 0;
  const getWorkerSkills = (name: string) => getWorkerByName(name)?.skills ?? [];

  return {
    workers,
    acceptedWorkers,
    isLoading,
    inviteWorker,
    updateWorker,
    deleteWorker,
    getWorkerByName,
    getWorkerRate,
    getWorkerSkills,
  };
}

export function useMyInvites() {
  const { user } = useAuth();

  const { data: invites = [], isLoading } = useQuery({
    queryKey: ['my-invites', user?.email],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_my_invites', { _email: user!.email! });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.email,
  });

  const acceptInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .rpc('accept_invite', { _invite_id: inviteId, _user_id: user!.id });
      if (error) throw error;
    },
  });

  return { invites, isLoading, acceptInvite };
}
