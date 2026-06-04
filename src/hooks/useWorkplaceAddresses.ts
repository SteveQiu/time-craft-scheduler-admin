import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkplaceAddress } from '@/pages/settings/types';

interface SaveAddressArgs {
  label: string;
  addressJson: string;
  editingId?: string;
  userId: string;
}

interface SetDefaultArgs {
  id: string;
  userId: string;
}

export function useWorkplaceAddresses(userId?: string) {
  const queryClient = useQueryClient();

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['workplace-addresses', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplace_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkplaceAddress[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const saveAddress = useMutation({
    mutationFn: async ({ label, addressJson, editingId, userId: uid }: SaveAddressArgs) => {
      if (editingId) {
        const { error } = await supabase
          .from('workplace_addresses')
          .update({ label, address: addressJson })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workplace_addresses')
          .insert({ user_id: uid, label, address: addressJson });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace-addresses'] }),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workplace_addresses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace-addresses'] }),
  });

  const setDefaultAddress = useMutation({
    mutationFn: async ({ id, userId: uid }: SetDefaultArgs) => {
      await supabase.from('workplace_addresses').update({ is_default: false }).eq('user_id', uid);
      const { error } = await supabase.from('workplace_addresses').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace-addresses'] }),
  });

  return { addresses, isLoading, saveAddress, deleteAddress, setDefaultAddress };
}
