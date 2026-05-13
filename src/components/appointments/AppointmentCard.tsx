import React from 'react';
import { Calendar, Clock, MapPin, Mail, Phone, User, FileImage, CalendarPlus, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { parseLocation, formatLocation } from '@/lib/address';
import { toGoogleCalendarUrl, toOutlookUrl, downloadICS } from './calendarExport';
import { Appointment } from './types';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

interface BookerInfoProps {
  appointment: Appointment;
  navigate: (path: string) => void;
}

export function BookerInfo({ appointment, navigate }: BookerInfoProps) {
  const bookerSlug = appointment.booker_slug;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="flex items-center space-x-2">
        <User className="h-4 w-4 text-muted-foreground" />
        {bookerSlug ? (
          <span
            className="text-sm font-medium text-primary hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${bookerSlug}`); }}
          >
            {appointment.booker_name || 'Unknown'}
          </span>
        ) : (
          <span
            className="text-sm font-medium text-primary hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${appointment.user_id}`); }}
          >
            {appointment.booker_name || 'Unknown'}
          </span>
        )}
      </div>
      {(appointment.booker_email || appointment.booker_phone) && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {appointment.booker_email && (
            <a
                href={`mailto:${appointment.booker_email}`} className="flex items-center space-x-1 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
              <Mail className="h-3 w-3" />
              <span>{appointment.booker_email}</span>
            </a>
          )}
          {appointment.booker_phone && (
            <a href={`tel:${appointment.booker_phone}`} className="flex items-center space-x-1 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
              <Phone className="h-3 w-3" />
              <span>{appointment.booker_phone}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  isInactive?: boolean;
  isOrgView: boolean;
  userId: string | undefined;
  selectedIds: Set<string>;
  onSelectionChange: (id: string, checked: boolean) => void;
  paidAppointmentIds: Map<string, string | null>;
  cashAppointmentIds: Set<string>;
  appointmentRateMap: Map<string, number>;
  getWorkerRate: (name: string) => number;
  onProviderViewProof: (id: string) => void;
  onPaymentInfo: (providerId: string, providerName: string, openingId: string, appointmentId: string) => void;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  navigate: (path: string) => void;
}

export function AppointmentCard({
  appointment,
  isInactive = false,
  isOrgView,
  userId,
  selectedIds,
  onSelectionChange,
  paidAppointmentIds,
  cashAppointmentIds,
  appointmentRateMap,
  getWorkerRate,
  onProviderViewProof,
  onPaymentInfo,
  navigate,
}: AppointmentCardProps) {
  const canManage = isOrgView || appointment.provider_id === userId;

  const getAppointmentTotal = (apt: Appointment): { isFree: boolean; total: number } => {
    // Priority 1: persisted `total` on the appointment (post-20260512 migration)
    if (apt.total != null && Number(apt.total) > 0) {
      const total = Number(apt.total);
      return { isFree: total === 0, total };
    }
    // Legacy fallback: derive from rate × duration
    let rate: number;
    if (apt.hourly_rate != null && Number(apt.hourly_rate) > 0) {
      rate = Number(apt.hourly_rate);
    } else if (isOrgView) {
      rate = getWorkerRate(apt.worker) || appointmentRateMap.get(apt.id) || 0;
    } else {
      rate = appointmentRateMap.get(apt.id) || 0;
    }
    const isFree = rate === 0;
    const durationHours = apt.duration > 24 ? apt.duration / 60 : apt.duration;
    const total = isFree ? 0 : rate * durationHours;
    return { isFree, total };
  };

  return (
    <Card
      key={appointment.id}
      className="shadow-soft border-card-border hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/appointments/${appointment.id}`)}
    >
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            {!isInactive && (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(appointment.id)}
                  onCheckedChange={(checked) => onSelectionChange(appointment.id, !!checked)}
                />
              </div>
            )}
            <div
              className="w-12 h-12 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${appointment.provider_slug || appointment.provider_id}`); }}
            >
              <span className="text-primary-foreground font-semibold">
                {appointment.worker.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div
              className="cursor-pointer"
              onClick={(e) => { e.stopPropagation(); navigate(`/profile/${appointment.provider_slug || appointment.provider_id}`); }}
            >
              <h3 className="font-semibold text-foreground hover:underline">{appointment.worker}</h3>
              <p className="text-sm text-muted-foreground">{appointment.service}</p>
            </div>
            {!canManage && appointment.provider_email && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                <Mail className="h-3 w-3" />
                <span
                  className="font-medium text-primary hover:underline cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${appointment.provider_slug || appointment.provider_id}`); }}
                >
                  {appointment.worker}
                </span>
                <span>(</span>
                <a
                  href={`mailto:${appointment.provider_email}`}
                  className="hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {appointment.provider_email}
                </a>
                <span>)</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="text-center sm:text-left">
              <div className="flex items-center space-x-1 text-sm font-medium text-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(appointment.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{appointment.start_time} - {appointment.end_time} ({appointment.duration}min)</span>
              </div>
            </div>

            {appointment.location && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{formatLocation(parseLocation(appointment.location))}</span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
              {(() => {
                const { isFree, total } = getAppointmentTotal(appointment);
                return (
                  <span className="text-sm font-medium text-muted-foreground">
                    {isFree ? 'Free' : `$${total % 1 === 0 ? total : total.toFixed(2)}`}
                  </span>
                );
              })()}
              {(() => {
                if (paidAppointmentIds.has(appointment.id)) {
                  // Provider sees "Paid" button to view submitted proof
                  if (!canManage) return null;
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`min-h-[44px] min-w-[44px] px-3 text-xs gap-1.5 ${cashAppointmentIds.has(appointment.id) ? 'border-orange-500 text-orange-600 hover:bg-orange-50' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                      onClick={(e) => { e.stopPropagation(); onProviderViewProof(appointment.id); }}
                      aria-label={`View payment proof for ${appointment.booker_name || 'this appointment'}`}
                    >
                      <FileImage className="w-4 h-4" aria-hidden="true" />
                      {cashAppointmentIds.has(appointment.id) ? 'Cash' : 'Paid'}
                    </Button>
                  );
                }
                // "Payment Required" is for customers only — providers don't pay
                if (canManage) return null;
                const { isFree } = getAppointmentTotal(appointment);
                if (isFree) return null;
                return (
                  <Badge variant="outline" className="text-red-600 border-red-600 dark:text-red-400 dark:border-red-400 text-xs">
                    Payment Required
                  </Badge>
                );
              })()}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" aria-label="Add to calendar" onClick={(e) => e.stopPropagation()}>
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.open(toGoogleCalendarUrl(appointment), '_blank')}>
                    Google Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(toOutlookUrl(appointment), '_blank')}>
                    Outlook Calendar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadICS([appointment])}>
                    Download .ics
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {appointment.user_id === userId && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onPaymentInfo(appointment.provider_id, appointment.worker, appointment.opening_id, appointment.id); }}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>How to Pay</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {canManage && appointment.user_id !== userId && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onProviderViewProof(appointment.id); }}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Payment Proof</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Customer info for provider */}
        {canManage && appointment.booker_name && (
          <div className="border-t border-border pt-3">
            <BookerInfo appointment={appointment} navigate={navigate} />
          </div>
        )}

        {/* Approval attribution for org view - show who approved if not the provider */}
        {isOrgView && appointment.status === 'confirmed' && appointment.approved_by && appointment.approved_by !== appointment.provider_id && appointment.approved_by_name && (
          <div className="border-t border-border pt-3">
            <div className="text-sm text-muted-foreground">
              Approved by: <span className="font-medium text-foreground">{appointment.approved_by_name}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
