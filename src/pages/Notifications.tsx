import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Loader2, Calendar, FileEdit, Star, Flag, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  is_unread: boolean;
}

const EVENT_LABELS: Record<string, { label: string; icon: any }> = {
  'appointment.created': { label: 'New booking request', icon: Calendar },
  'appointment.confirmed': { label: 'Booking confirmed', icon: Check },
  'appointment.cancelled': { label: 'Booking cancelled', icon: Calendar },
  'appointment.completed': { label: 'Appointment completed', icon: Check },
  'appointment.pending': { label: 'Booking pending', icon: Calendar },
  'opening.created': { label: 'Opening created', icon: FileEdit },
  'opening.updated': { label: 'Opening updated', icon: FileEdit },
  'opening.deleted': { label: 'Opening deleted', icon: FileEdit },
  'review.created': { label: 'New review', icon: Star },
  'report.created': { label: 'Report submitted', icon: Flag },
  'role.granted': { label: 'Role granted', icon: Shield },
  'role.revoked': { label: 'Role revoked', icon: Shield },
  'payment.proof_submitted': { label: 'Payment confirmed', icon: Check },
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_notifications', { _limit: 100, _offset: 0 });
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  // Collect appointment IDs from new-booking notifications to check payment status
  const newBookingAppointmentIds = useMemo(
    () =>
      notifications
        .filter(n => n.event_type === 'appointment.created' && n.entity_id)
        .map(n => n.entity_id as string),
    [notifications]
  );

  const { data: submittedProofs } = useQuery({
    queryKey: ['payment-proofs-bulk', newBookingAppointmentIds],
    enabled: newBookingAppointmentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_proofs')
        .select('appointment_id')
        .in('appointment_id', newBookingAppointmentIds);
      return data ?? [];
    },
  });

  const paidAppointmentIds = useMemo(
    () => new Set((submittedProofs ?? []).map((p: { appointment_id: string }) => p.appointment_id)),
    [submittedProofs]
  );

  // Mark all as read on mount
  useEffect(() => {
    if (!user) return;
    supabase.rpc('mark_notifications_read').then(() => {
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    });
  }, [user, queryClient]);

  const handleMarkAllRead = async () => {
    const { error } = await supabase.rpc('mark_notifications_read');
    if (error) {
      toast.error('Failed to mark as read');
      return;
    }
    toast.success('All notifications marked as read');
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-count'] });
  };

  const handleClick = (n: Notification) => {
    if (n.entity_type === 'appointment' && n.entity_id) {
      navigate(`/appointments/${n.entity_id}`);
    } else if (n.entity_type === 'opening' && n.entity_id) {
      navigate(`/openings/${n.entity_id}`);
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-12 text-center text-muted-foreground">Sign in to view notifications.</CardContent></Card>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => n.is_unread).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && <Badge variant="default">{unreadCount} new</Badge>}
        </div>
        {notifications.length > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = EVENT_LABELS[n.event_type] || { label: n.event_type, icon: Bell };
            const Icon = cfg.icon;
            const clickable = n.entity_type === 'appointment' || n.entity_type === 'opening';
            return (
              <Card
                key={n.id}
                className={`shadow-soft border-card-border transition-colors ${clickable ? 'cursor-pointer hover:bg-accent/50' : ''} ${n.is_unread ? 'border-l-4 border-l-primary' : ''}`}
                onClick={() => clickable && handleClick(n)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-md ${n.is_unread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-foreground ${n.is_unread ? 'font-bold' : 'font-medium'}`}>{cfg.label}</p>
                      {n.is_unread && <Badge variant="secondary" className="text-xs">New</Badge>}
                      {n.event_type === 'appointment.created' && n.entity_id && paidAppointmentIds.has(n.entity_id) && (
                        <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400 text-xs">Paid</Badge>
                      )}
                    </div>
                    {n.metadata && Object.keys(n.metadata).length > 0 && (
                      <p className={`text-sm mt-0.5 truncate ${n.is_unread ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                        {[n.metadata.worker, n.metadata.service, n.metadata.date].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
