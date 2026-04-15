import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Clock, MapPin, ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ModifyAppointmentDialogProps {
  appointmentId: string;
  currentOpeningId: string;
  userId: string;
  providerId: string;
  workerName: string;
}

export function ModifyAppointmentDialog({ appointmentId, currentOpeningId, userId, providerId, workerName }: ModifyAppointmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [modifying, setModifying] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: availableOpenings = [], isLoading } = useQuery({
    queryKey: ['available-openings-for-modify', currentOpeningId, providerId, workerName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('*')
        .eq('is_available', true)
        .eq('user_id', providerId)
        .eq('worker', workerName)
        .neq('id', currentOpeningId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleModify = async (newOpeningId: string) => {
    setModifying(newOpeningId);
    try {
      const { error } = await supabase.rpc('modify_appointment', {
        _appointment_id: appointmentId,
        _new_opening_id: newOpeningId,
        _caller_id: userId,
      });
      if (error) throw error;
      toast.success('预约已修改！');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || '修改失败');
    } finally {
      setModifying(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowRightLeft className="h-3 w-3 mr-1" />
          Modify
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modify Your Appointment — {workerName}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && availableOpenings.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No available openings to switch to.</p>
        )}

        <div className="space-y-3">
          {availableOpenings.map((opening) => (
            <Card key={opening.id} className="shadow-soft border-card-border hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{opening.worker} — {opening.service}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(opening.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {opening.start_time} - {opening.end_time}
                    </span>
                    {opening.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {opening.location}
                      </span>
                    )}
                  </div>
                  {opening.hourly_rate > 0 && (
                    <Badge variant="secondary" className="text-xs">${opening.hourly_rate}/hr</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  disabled={!!modifying}
                  onClick={() => handleModify(opening.id)}
                >
                  {modifying === opening.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Select'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
