import React from 'react';
import { Calendar, Clock, MapPin, Users, Check, X, FileImage, CalendarPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { parseLocation, formatLocation } from '@/lib/address';
import { getAppointmentTotal, isAppointmentFree } from '@/lib/appointment/utils';
import { toGoogleCalendarUrl, toOutlookUrl, downloadICS } from './calendarExport';
import { Appointment } from './types';
import { BookerInfo } from './AppointmentCard';
import { formatDateOnly } from '@/lib/date';

interface PendingGroupSectionProps {
  openingId: string;
  appts: Appointment[];
  userId: string | undefined;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  paidAppointmentIds: Map<string, string | null>;
  cashAppointmentIds: Set<string>;
  cardAppointmentIds: Set<string>;
  onsiteOnlyPaymentAppointmentIds: Set<string>;
  appointmentRateMap: Map<string, number>;
  onProviderViewProof: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  navigate: (path: string) => void;
  flaggedCustomerIds: Map<string, { reason: string; notes: string | null }>;
  onFlagCustomer: (userId: string, name: string, appointmentId: string) => void;
  onUnflagCustomer: (userId: string, name: string) => void;
  isPremium: boolean;
  attendanceStatsMap: Map<string, { totalCount: number; flaggedCount: number; attendancePct: number }>;
}

export function PendingGroupSection({
  openingId: _openingId,
  appts,
  userId,
  selectedIds,
  setSelectedIds,
  paidAppointmentIds,
  cashAppointmentIds,
  cardAppointmentIds,
  onsiteOnlyPaymentAppointmentIds,
  appointmentRateMap,
  onProviderViewProof,
  onApprove,
  onReject,
  onCancel,
  navigate,
  flaggedCustomerIds,
  onFlagCustomer,
  onUnflagCustomer,
  isPremium,
  attendanceStatsMap,
}: PendingGroupSectionProps) {
  const first = appts[0];
  const isProvider = first.provider_id === userId;
  const pricingContext = { appointmentRateMap };

  return (
    <Card className="shadow-soft border-card-border hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-3 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div
              className={`w-12 h-12 bg-primary rounded-full flex items-center justify-center ${first.provider_slug ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}`}
              onClick={() => first.provider_slug && navigate(`/profile/${first.provider_slug}`)}
            >
              <span className="text-primary-foreground font-semibold">
                {first.worker.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{first.worker}</h3>
              <p className="text-sm text-muted-foreground">{first.service}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="text-center sm:text-left">
              <div className="flex items-center space-x-1 text-sm font-medium text-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDateOnly(first.date)}</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{first.start_time} - {first.end_time} ({first.duration}min)</span>
              </div>
            </div>
            {first.location && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{formatLocation(parseLocation(first.location))}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                <Users className="h-3 w-3 mr-1" />
                {appts.length} Pending {appts.length > 1 ? 'Requests' : 'Request'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-3 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {isProvider ? 'Choose one to approve:' : `Pending requests for ${first.worker}`}
          </p>
          {appts.map((apt) => {
            const aptIsProvider = apt.provider_id === userId;
            return (
              <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIds.has(apt.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (checked) {
                          next.add(apt.id);
                        } else {
                          next.delete(apt.id);
                        }
                        return next;
                      });
                    }}
                  />
                  <BookerInfo
                    appointment={apt}
                    navigate={navigate}
                    isPremium={isPremium}
                    canManage={aptIsProvider}
                    flaggedCustomerIds={flaggedCustomerIds}
                    onFlagCustomer={onFlagCustomer}
                    onUnflagCustomer={onUnflagCustomer}
                    attendanceStats={apt.user_id ? attendanceStatsMap.get(apt.user_id) : undefined}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const total = getAppointmentTotal(apt, pricingContext);
                    return (
                      <span className="text-sm font-medium text-muted-foreground">
                        {isAppointmentFree(apt, pricingContext) ? 'Free' : `$${total % 1 === 0 ? total : total.toFixed(2)}`}
                      </span>
                    );
                  })()}
                  {(() => {
                    if (paidAppointmentIds.has(apt.id)) {
                      if (!aptIsProvider) return null;
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`min-h-[44px] min-w-[44px] px-3 text-xs gap-1.5 ${cardAppointmentIds.has(apt.id) || cashAppointmentIds.has(apt.id) ? 'border-orange-500 text-orange-600 hover:bg-orange-50' : 'border-green-500 text-green-600 hover:bg-green-50'}`}
                          onClick={() => onProviderViewProof(apt.id)}
                          aria-label={`View payment proof for ${apt.booker_name || 'this appointment'}`}
                        >
                          <FileImage className="w-4 h-4" aria-hidden="true" />
                          {cardAppointmentIds.has(apt.id) || cashAppointmentIds.has(apt.id) ? (cardAppointmentIds.has(apt.id) ? 'Card' : 'Cash') : 'Paid'}
                        </Button>
                      );
                    }
                    if (aptIsProvider) return null;
                    const showPaymentRequired = !isAppointmentFree(apt, pricingContext) && !onsiteOnlyPaymentAppointmentIds.has(apt.id);
                    if (!showPaymentRequired) return null;
                    return (
                      <Badge variant="outline" className="text-red-600 border-red-600 dark:text-red-400 dark:border-red-400 text-xs">
                        Payment Required
                      </Badge>
                    );
                  })()}
                  {aptIsProvider ? (
                    <>
                      <Button variant="default" size="sm" onClick={() => onApprove(apt.id)}>
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onReject(apt.id)}>
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => onCancel(apt.id)}>
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label="Add to calendar">
                        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.open(toGoogleCalendarUrl(apt), '_blank')}>
                        Google Calendar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(toOutlookUrl(apt), '_blank')}>
                        Outlook Calendar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadICS([apt])}>
                        Download .ics
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
