import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseAllAttendanceStatsParams {
  userIds: string[];
  providerId: string | undefined;
  enabled: boolean;
}

interface AttendanceStats {
  totalCount: number;
  flaggedCount: number;
  attendancePct: number;
}

export function useAllAttendanceStats({ userIds, providerId, enabled }: UseAllAttendanceStatsParams) {
  const { data: attendanceStatsMap = new Map<string, AttendanceStats>(), isLoading } = useQuery({
    queryKey: ['allAttendanceStats', providerId, userIds],
    queryFn: async () => {
      if (!providerId || userIds.length === 0) {
        return new Map<string, AttendanceStats>();
      }

      // Bulk query: aggregate per user_id
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          user_id,
          id,
          appointment_flags!left(appointment_id)
        `)
        .eq('provider_id', providerId)
        .in('user_id', userIds);

      if (error) {
        console.warn('[useAllAttendanceStats] query failed (table or FK may not exist yet):', error.message);
        return new Map<string, AttendanceStats>();
      }

      // Process results into a map
      const statsMap = new Map<string, AttendanceStats>();
      const userCounts = new Map<string, { total: number; flagged: Set<string> }>();

      data.forEach((row: any) => {
        const userId = row.user_id;
        if (!userCounts.has(userId)) {
          userCounts.set(userId, { total: 0, flagged: new Set() });
        }
        const counts = userCounts.get(userId)!;
        counts.total += 1;

        // Check if this appointment has any flags from this provider
        if (row.appointment_flags && row.appointment_flags.length > 0) {
          counts.flagged.add(row.id);
        }
      });

      // Calculate percentages
      userCounts.forEach((counts, userId) => {
        const flaggedCount = counts.flagged.size;
        const totalCount = counts.total;
        const attendancePct = totalCount === 0 ? 100 : Math.round(((totalCount - flaggedCount) / totalCount) * 100);
        
        statsMap.set(userId, {
          totalCount,
          flaggedCount,
          attendancePct,
        });
      });

      return statsMap;
    },
    enabled: enabled && !!providerId && userIds.length > 0,
    throwOnError: false,
    retry: false,
  });

  return { attendanceStatsMap, isLoading };
}
