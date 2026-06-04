import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Appointment } from '@/components/appointments/types';

interface UseAppointmentsParams {
  userId: string | undefined;
}

export function useAppointments({ userId }: UseAppointmentsParams) {
  return useQuery({
    queryKey: ['appointments', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`user_id.eq.${userId},provider_id.eq.${userId}`)
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

      // Fetch contact info for all participants — direct query bypasses the email_public gate
      // so both sides of a confirmed appointment always see each other's contact details.
      const allContactIds = [...new Set([...bookerIds, ...providerIds])];
      let contactMap = new Map<string, { email: string | null; phone: string | null }>();
      if (allContactIds.length > 0) {
        const { data: contacts } = await supabase
          .rpc('get_appointment_contact_info', { profile_ids: allContactIds });
        (contacts || []).forEach((c: any) => {
          contactMap.set(c.id, { email: c.email ?? null, phone: c.phone ?? null });
        });
      }

      return (data || []).map((a: any) => ({
        ...a,
        provider_slug: profileMap.get(a.provider_id)?.slug || null,
        provider_email: contactMap.get(a.provider_id)?.email || null,
        booker_name: profileMap.get(a.user_id)?.full_name || null,
        booker_slug: profileMap.get(a.user_id)?.slug || null,
        booker_email: contactMap.get(a.user_id)?.email || null,
        booker_phone: contactMap.get(a.user_id)?.phone || null,
        approved_by_name: profileMap.get(a.approved_by)?.full_name || null,
      })) as Appointment[];
    },
    enabled: !!userId,
  });
}
