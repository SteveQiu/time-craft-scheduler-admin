import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, Loader2, MapPin } from 'lucide-react';
import { ProfilePhotoStrip } from '@/components/ProfilePhotoStrip';
import { DATE_FORMATS, LOCALE } from '@/config/formats';
import { ROUTES } from '@/config/routes';
import { supabase } from '@/integrations/supabase/client';
import { parseLocation, formatLocation } from '@/lib/address';
import { Appointment } from '@/components/appointments/types';
import { formatDateOnly } from '@/lib/date';

interface ProviderProfile {
  full_name: string | null;
  slug: string | null;
  avatar_url: string | null;
  introduction: string | null;
  skills: string[];
}

export function AppointmentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: appointment, isLoading } = useQuery<Appointment & { providerProfile: ProviderProfile | null }>({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;

      const [bookerRes, providerRes] = await Promise.all([
        data.user_id
          ? supabase.rpc('get_public_profile_by_id', { profile_id: data.user_id })
          : Promise.resolve({ data: null }),
        data.provider_id
          ? supabase.rpc('get_public_profile_by_id', { profile_id: data.provider_id })
          : Promise.resolve({ data: null }),
      ]);

      const booker = (bookerRes as any).data?.[0] ?? null;
      const provider = (providerRes as any).data?.[0] ?? null;

      return {
        ...data,
        provider_slug: provider?.slug ?? null,
        booker_name: booker?.full_name ?? null,
        booker_slug: booker?.slug ?? null,
        booker_email: booker?.email ?? null,
        booker_phone: booker?.phone ?? null,
        providerProfile: provider ? {
          full_name: provider.full_name ?? null,
          slug: provider.slug ?? null,
          avatar_url: provider.avatar_url ?? null,
          introduction: provider.introduction ?? null,
          skills: provider.skills ?? [],
        } : null,
      } as Appointment & { providerProfile: ProviderProfile | null };
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

  const isFreeAppointment = appointment.total != null && Number(appointment.total) === 0;
  const totalAmount = appointment.total != null && Number(appointment.total) > 0
    ? Number(appointment.total)
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(ROUTES.appointments)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>
        <Badge className={getStatusColor(appointment.status)}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </Badge>
      </div>
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-soft border-card-border">
          <CardHeader>
            <CardTitle className="text-2xl">Appointment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider */}
            {appointment.providerProfile && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Provider</h3>
                <div className="flex items-start space-x-4">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center overflow-hidden shrink-0">
                    {appointment.providerProfile.avatar_url ? (
                      <img
                        src={appointment.providerProfile.avatar_url}
                        alt={appointment.providerProfile.full_name || ''}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {appointment.providerProfile.slug ? (
                      <button
                        className="font-semibold text-lg text-primary hover:underline text-left"
                        onClick={() => navigate(`/profile/${appointment.providerProfile!.slug}`)}
                      >
                        {appointment.providerProfile.full_name || appointment.worker}
                      </button>
                    ) : (
                      <p className="font-semibold text-lg text-foreground">
                        {appointment.providerProfile.full_name || appointment.worker}
                      </p>
                    )}
                    {appointment.providerProfile.introduction && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                        {appointment.providerProfile.introduction}
                      </p>
                    )}
                    {appointment.providerProfile.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {appointment.providerProfile.skills.slice(0, 5).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {appointment.provider_id && (
                  <div className="mt-3">
                    <ProfilePhotoStrip userId={appointment.provider_id} />
                  </div>
                )}
              </div>
            )}

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
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium text-foreground">{appointment.duration} minutes</p>
                </div>
                {(totalAmount != null || isFreeAppointment) && (
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-medium text-foreground">
                      {isFreeAppointment
                        ? 'Free'
                        : `$${totalAmount! % 1 === 0 ? totalAmount : totalAmount!.toFixed(2)}`}
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
                    {formatDateOnly(appointment.date, LOCALE, DATE_FORMATS.long)}
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
