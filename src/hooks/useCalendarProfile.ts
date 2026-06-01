import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseCalendarProfileParams {
  user: { id: string; email?: string } | null | undefined;
  isOrgMode: boolean;
  getOrgWorkerRate: (name: string) => number;
  getOrgWorkerSkills: (name: string) => string[];
}

export function useCalendarProfile({
  user,
  isOrgMode,
  getOrgWorkerRate,
  getOrgWorkerSkills,
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
    enabled: !!user && !isOrgMode,
  });

  const getWorkerRate = (name: string): number => {
    if (isOrgMode) return getOrgWorkerRate(name);
    return ownProfile?.hourly_rate ?? 0;
  };

  const getWorkerSkills = (name: string): string[] => {
    if (isOrgMode) return getOrgWorkerSkills(name);
    return ownProfile?.skills ?? [];
  };

  const selfWorkerName = ownProfile?.full_name || user?.email || 'Me';

  return { ownProfile, getWorkerRate, getWorkerSkills, selfWorkerName };
}
