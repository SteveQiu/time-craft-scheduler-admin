import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseCalendarProfileParams {
  user: { id: string; email?: string } | null | undefined;
}

export function useCalendarProfile({
  user,
}: UseCalendarProfileParams) {
  const { data: ownProfile } = useQuery({
    queryKey: ['own-profile-for-openings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, skills, hourly_rate, custom_inquiry_open')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as { full_name: string | null; skills: string[]; hourly_rate: number; custom_inquiry_open: boolean };
    },
    enabled: !!user,
  });

  const selfResourceName = ownProfile?.full_name || user?.email || 'Me';

  return { ownProfile, selfResourceName };
}
