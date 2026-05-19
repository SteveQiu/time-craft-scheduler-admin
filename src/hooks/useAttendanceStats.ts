import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseAttendanceStatsParams {
  userId: string | undefined;
  providerId: string | undefined;
  enabled: boolean;
}

interface AttendanceStats {
  totalCount: number;
  flaggedCount: number;
  attendancePct: number;
}

export function useAttendanceStats({ userId, providerId, enabled }: UseAttendanceStatsParams) {
  const { data, isLoading } = useQuery({
    queryKey: ['attendanceStats', userId, providerId],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!userId || !providerId) {
        return { totalCount: 0, flaggedCount: 0, attendancePct: 100 };
      }

      const { data, error } = await supabase.rpc('get_user_attendance_stats', {
        p_user_id: userId,
        p_provider_id: providerId,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      return {
        totalCount: Number(row?.total_count || 0),
        flaggedCount: Number(row?.flagged_count || 0),
        attendancePct: Number(row?.attendance_pct || 100),
      };
    },
    enabled: enabled && !!userId && !!providerId,
  });

  return {
    totalCount: data?.totalCount || 0,
    flaggedCount: data?.flaggedCount || 0,
    attendancePct: data?.attendancePct || 100,
    isLoading,
  };
}
