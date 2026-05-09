import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/components/appointments/types';

interface UseAppointmentsParams {
  userId: string | undefined;
  isOrgView: boolean;
  acceptedWorkers: string[];
}

export function useAppointments({ userId, isOrgView, acceptedWorkers }: UseAppointmentsParams) {
  return useQuery({
    queryKey: ['appointments', userId, isOrgView, acceptedWorkers],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('appointments')
        .select('*');

      if (isOrgView) {
        // Org view: show appointments where provider is the org (provider_id = org owner)
        // All org openings/appointments have provider_id = org owner's ID
        query = query.eq('provider_id', userId);
      } else {
        // User view: show appointments where user is either:
        // 1. The booker/customer (user_id = user.id), OR
        // 2. The provider who needs to approve/manage (provider_id = user.id)
        query = query.or(`user_id.eq.${userId},provider_id.eq.${userId}`);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      const providerIds = [...new Set((data || []).map((a: any) => a.provider_id))];
      const bookerIds = [...new Set((data || []).map((a: any) => a.user_id))];
      const approverIds = [...new Set((data || []).map((a: any) => a.approved_by).filter(Boolean))];
      const allIds = [...new Set([...providerIds, ...bookerIds, ...approverIds])];
      
      let profileMap = new Map<string, { full_name: string; slug: string | null }>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_public_profile_names', { profile_ids: allIds });
        profileMap = new Map((profiles || []).map((p: any) => [p.id, { full_name: p.full_name, slug: p.slug }]));
      }

      let bookerContactMap = new Map<string, { email: string | null; phone: string | null }>();
      if (bookerIds.length > 0) {
        const contactResults = await Promise.all(
          bookerIds.map((id) => supabase.rpc('get_public_profile_by_id', { profile_id: id }))
        );
        contactResults.forEach((res, idx) => {
          const p = (res.data && (res.data as any)[0]) || null;
          bookerContactMap.set(bookerIds[idx], { email: p?.email ?? null, phone: p?.phone ?? null });
        });
      }

      return (data || []).map((a: any) => ({
        ...a,
        provider_slug: profileMap.get(a.provider_id)?.slug || null,
        booker_name: profileMap.get(a.user_id)?.full_name || null,
        booker_slug: profileMap.get(a.user_id)?.slug || null,
        booker_email: bookerContactMap.get(a.user_id)?.email || null,
        booker_phone: bookerContactMap.get(a.user_id)?.phone || null,
        approved_by_name: profileMap.get(a.approved_by)?.full_name || null,
      })) as Appointment[];
    },
    enabled: !!userId,
  });
}
