import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, Loader2, MapPin } from 'lucide-react';
import { DATE_FORMATS, LOCALE } from '@/config/formats';
import { ROUTES } from '@/config/routes';
import { supabase } from '@/integrations/supabase/client';
import { parseLocation, formatLocation } from '@/lib/address';
import { useAuth } from '@/hooks/useAuth';
import { PremiumUpgrade } from '@/components/PremiumUpgrade';
import { Appointment } from '@/components/appointments/types';

export function AppointmentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: appointment, isLoading } = useQuery<Appointment>({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;

      const allIds = [...new Set([data.provider_id, data.user_id].filter(Boolean))];
      let profileMap = new Map<string, { full_name: string; slug: string | null }>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_public_profile_names', { profile_ids: allIds });
        profileMap = new Map((profiles || []).map((p: any) => [p.id, { full_name: p.full_name, slug: p.slug }]));
      }

      let bookerEmail: string | null = null;
      let bookerPhone: string | null = null;
      if (data.user_id) {
        const { data: bookerProfile } = await supabase
          .rpc('get_public_profile_by_id', { profile_id: data.user_id });
        const p = bookerProfile?.[0] ?? null;
        bookerEmail = p?.email ?? null;
        bookerPhone = p?.phone ?? null;
      }

      return {
        ...data,
        provider_slug: profileMap.get(data.provider_id)?.slug ?? null,
        booker_name: profileMap.get(data.user_id)?.full_name ?? null,
        booker_slug: profileMap.get(data.user_id)?.slug ?? null,
        booker_email: bookerEmail,
        booker_phone: bookerPhone,
      } as Appointment;
    },
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success-light text-success';
      case 'pending': return 'bg-warning-light text-warning';
      case 'cancelled': return 'bg-destructive-light text-destructive';
      case 'completed': return 'bg-primary-light text-primary';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Appointment not found</p>
            <Button onClick={() => navigate(ROUTES.appointments)} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = appointment.total != null && Number(appointment.total) > 0
    ? Number(appointment.total)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(ROUTES.appointments)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>
        <Badge className={getStatusColor(appointment.status)}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </Badge>
      </div>
      <div className="flex justify-end max-w-4xl mx-auto">
        {user && <PremiumUpgrade orgId={user.id} />}
      </div>
        <Card className="shadow-soft border-card-border">
          <CardHeader>
            <CardTitle className="text-2xl">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Information */}
            {(appointment.booker_name || appointment.booker_email || appointment.booker_phone) && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Client Information</h3>
                <div className="space-y-3">
                  {appointment.booker_name && (
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold text-sm">
                          {appointment.booker_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <p className="font-medium text-foreground">{appointment.booker_name}</p>
                    </div>
                  )}
                  {appointment.booker_email && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${appointment.booker_email}`} className="hover:text-primary transition-colors">
                        {appointment.booker_email}
                      </a>
                    </div>
                  )}
                  {appointment.booker_phone && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${appointment.booker_phone}`} className="hover:text-primary transition-colors">
                        {appointment.booker_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Service Details */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Service Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium text-foreground">{appointment.service}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {appointment.provider_slug ? (
                      <button
                        className="font-medium text-primary hover:underline"
                        onClick={() => navigate(`/profile/${appointment.provider_slug}`)}
                      >
                        {appointment.worker}
                      </button>
                    ) : (
                      <p className="font-medium text-foreground">{appointment.worker}</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium text-foreground">{appointment.duration} minutes</p>
                </div>
                {totalAmount != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-medium text-foreground">
                      ${totalAmount % 1 === 0 ? totalAmount : totalAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">
                    {new Date(appointment.date).toLocaleDateString(LOCALE, DATE_FORMATS.long)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">
                    {appointment.start_time} – {appointment.end_time}
                  </p>
                </div>
                {appointment.location && (
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <p className="font-medium text-foreground">
                      {formatLocation(parseLocation(appointment.location))}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Notes</h3>
                <div className="p-4 bg-secondary rounded-lg">
                  <p className="text-muted-foreground">{appointment.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
