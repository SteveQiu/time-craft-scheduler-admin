import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Opening } from '@/components/calendar/types';

interface UseCalendarOpeningsParams {
  user: { id: string } | null | undefined;
}

export function useCalendarOpenings({ user }: UseCalendarOpeningsParams) {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmedOpeningIds, setConfirmedOpeningIds] = useState<Set<string>>(new Set());

  const loadOpeningsForMonth = useCallback(async (currentDate: Date) => {
    if (!currentDate || !user) return;
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startStr = firstDay.toISOString().split('T')[0];
      const endStr = lastDay.toISOString().split('T')[0];

      let query = supabase
        .from('openings')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date')
        .order('start_time');

      // In both user and org mode, openings are stored with user_id = owner's ID
      query = query.eq('user_id', user.id);

      const { data, error } = await query;
      if (error) throw error;
      setOpenings(data || []);

      const openingIds = (data || []).filter(o => !o.is_available).map(o => o.id);
      if (openingIds.length > 0) {
        const { data: confirmedApts } = await supabase
          .from('appointments')
          .select('opening_id')
          .in('opening_id', openingIds)
          .in('status', ['confirmed', 'completed']);
        setConfirmedOpeningIds(new Set((confirmedApts || []).map(a => a.opening_id)));
      } else {
        setConfirmedOpeningIds(new Set());
      }
    } catch (error) {
      console.error('Error loading openings:', error);
      toast.error('Failed to load openings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    openings,
    setOpenings,
    loading,
    setLoading,
    confirmedOpeningIds,
    setConfirmedOpeningIds,
    loadOpeningsForMonth,
  };
}
