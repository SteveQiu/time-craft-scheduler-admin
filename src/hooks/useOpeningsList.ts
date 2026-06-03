import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Opening } from '@/components/calendar/types';

interface UseOpeningsListParams {
  userId: string | undefined;
}

export function useOpeningsList({ userId }: UseOpeningsListParams) {
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmedOpeningIds, setConfirmedOpeningIds] = useState<Set<string>>(new Set());

  const getYesterdayLocal = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('openings')
        .select('*')
        .eq('user_id', userId)
        .gte('date', getYesterdayLocal())
        .order('date')
        .order('start_time')
        .limit(500);

      if (error) throw error;
      setOpenings(data || []);

      const bookedIds = (data || []).filter(o => !o.is_available).map(o => o.id);
      if (bookedIds.length > 0) {
        const { data: confirmed } = await supabase
          .from('appointments')
          .select('opening_id')
          .in('opening_id', bookedIds)
          .in('status', ['confirmed', 'completed', 'pending']);
        setConfirmedOpeningIds(new Set((confirmed || []).map(a => a.opening_id)));
      } else {
        setConfirmedOpeningIds(new Set());
      }
    } catch (err) {
      console.error('Failed to load openings list:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const removeOpenings = (ids: Set<string>) => {
    setOpenings(prev => prev.filter(o => !ids.has(o.id)));
  };

  const updateOpenings = (ids: Set<string>, updates: Partial<Opening>) => {
    setOpenings(prev => prev.map(o => ids.has(o.id) ? { ...o, ...updates } : o));
  };

  return { openings, loading, confirmedOpeningIds, reload: load, removeOpenings, updateOpenings };
}
