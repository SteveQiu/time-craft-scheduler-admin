import React from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getWeekStartSunday, formatWeekLabel, DateFilter } from './calendarExport';
import { Appointment } from './types';
import { AppointmentCard } from './AppointmentCard';
import { BulkActionBar } from './BulkActionBar';
import { FlagCustomerDialog } from './FlagCustomerDialog';
import { PendingGroupSection } from './PendingGroupSection';
import { useCustomerBehaviorFlags } from '@/hooks/useCustomerBehaviorFlags';

interface AppointmentListProps {
  activeAppointments: Appointment[];
  filteredNonPendingActive: Appointment[];
  filteredInactive: Appointment[];
  userId: string | undefined;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  paidAppointmentIds: Map<string, string | null>;
  cashAppointmentIds: Set<string>;
  cardAppointmentIds: Set<string>;
  onsiteOnlyPaymentAppointmentIds: Set<string>;
  appointmentRateMap: Map<string, number>;
  groupedPendingByOpening: Map<string, Appointment[]>;
  dateFilter: DateFilter;
  showInactive: boolean;
  setShowInactive: (v: boolean) => void;
  onProviderViewProof: (id: string) => void;
  onPaymentInfo: (providerId: string, providerName: string, openingId: string, appointmentId: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  navigate: (path: string) => void;
  isBulkActing: boolean;
  isLoading: boolean;
  onBulkApprove: () => void;
  onBulkDeny: () => void;
  onBulkCancel: () => void;
  onBulkComplete: () => void;
  onStartBulkModify: () => void;
  appointments: Appointment[];
  flaggedAppointmentIds: Set<string>;
  onFlag: (appointmentId: string, bookerUserId: string, bookerName: string) => void;
  onUnflag: (appointmentId: string, bookerName: string) => void;
  isPremium: boolean;
  attendanceStatsMap: Map<string, { totalCount: number; flaggedCount: number; attendancePct: number }>;
}

export function AppointmentList({
  activeAppointments,
  filteredNonPendingActive,
  filteredInactive,
  userId,
  selectedIds,
  setSelectedIds,
  paidAppointmentIds,
  cashAppointmentIds,
  cardAppointmentIds,
  onsiteOnlyPaymentAppointmentIds,
  appointmentRateMap,
  groupedPendingByOpening,
  dateFilter,
  showInactive,
  setShowInactive,
  onProviderViewProof,
  onPaymentInfo,
  onApprove,
  onReject,
  onCancel,
  navigate,
  isBulkActing,
  onBulkApprove,
  onBulkDeny,
  onBulkCancel,
  onBulkComplete,
  onStartBulkModify,
  appointments,
  flaggedAppointmentIds,
  onFlag,
  onUnflag,
  isPremium,
  attendanceStatsMap,
}: AppointmentListProps) {
  const { flaggedCustomerIds, flagCustomer, unflagCustomer } = useCustomerBehaviorFlags({ userId });
  const [flagCustomerDialog, setFlagCustomerDialog] = React.useState({
    open: false,
    customerId: '',
    customerName: '',
    appointmentId: '',
  });

  const handleOpenFlagCustomer = (customerId: string, customerName: string, appointmentId: string) => {
    setFlagCustomerDialog({
      open: true,
      customerId,
      customerName,
      appointmentId,
    });
  };

  const handleCloseFlagCustomer = (open: boolean) => {
    setFlagCustomerDialog((current) => ({
      ...current,
      open,
    }));
  };

  const handleFlagCustomer = async (customerId: string, reason: string, notes: string, appointmentId?: string) => {
    try {
      await flagCustomer(customerId, reason, notes, appointmentId);
      toast.success('Customer flagged');
    } catch (error) {
      console.error('Failed to flag customer', error);
      toast.error('Failed to flag customer');
      throw error;
    }
  };

  const handleUnflagCustomer = async (customerId: string, customerName: string) => {
    try {
      await unflagCustomer(customerId);
      toast.success(`${customerName} unflagged`);
    } catch (error) {
      console.error('Failed to unflag customer', error);
      toast.error('Failed to unflag customer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Active Appointments</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => {
              if (selectedIds.size === activeAppointments.length) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(activeAppointments.map(a => a.id)));
              }
            }}>
              {selectedIds.size === activeAppointments.length && activeAppointments.length > 0 ? 'Deselect All' : 'Select All'}
            </Button>
            <Badge variant="outline">{activeAppointments.length}</Badge>
          </div>
        </div>

        <BulkActionBar
          selectedIds={selectedIds}
          appointments={appointments}
          userId={userId}
          isBulkActing={isBulkActing}
          onApprove={onBulkApprove}
          onDeny={onBulkDeny}
          onComplete={onBulkComplete}
          onModify={onStartBulkModify}
          onCancel={onBulkCancel}
          onClear={() => setSelectedIds(new Set())}
        />

        {Array.from(groupedPendingByOpening.entries()).map(([openingId, appts]) => (
          <PendingGroupSection
            key={`group-${openingId}`}
            openingId={openingId}
            appts={appts}
            userId={userId}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            paidAppointmentIds={paidAppointmentIds}
            cashAppointmentIds={cashAppointmentIds}
            cardAppointmentIds={cardAppointmentIds}
            onsiteOnlyPaymentAppointmentIds={onsiteOnlyPaymentAppointmentIds}
            appointmentRateMap={appointmentRateMap}
            onProviderViewProof={onProviderViewProof}
            onApprove={onApprove}
            onReject={onReject}
            onCancel={onCancel}
            navigate={navigate}
            flaggedCustomerIds={flaggedCustomerIds}
            onFlagCustomer={handleOpenFlagCustomer}
            onUnflagCustomer={handleUnflagCustomer}
            isPremium={isPremium}
            attendanceStatsMap={attendanceStatsMap}
          />
        ))}

        {filteredNonPendingActive.length > 0 ? (
          <div className="space-y-4">
            {(() => {
              const showWeekDividers = dateFilter === 'all' || dateFilter === 'month';
              let lastWeekStart = '';
              return filteredNonPendingActive.map((apt) => {
                const weekStart = getWeekStartSunday(apt.date);
                const showDivider = showWeekDividers && weekStart !== lastWeekStart;
                lastWeekStart = weekStart;
                const label = formatWeekLabel(weekStart);
                return (
                  <React.Fragment key={apt.id}>
                    {showDivider && (
                      <div className={apt === filteredNonPendingActive[0] ? '' : 'mt-6'}>
                        <p className="text-sm font-semibold text-foreground mb-2">Week of {label}</p>
                        <div className="h-px bg-border mb-4" />
                      </div>
                    )}
                    <AppointmentCard
                      appointment={apt}
                      userId={userId}
                      selectedIds={selectedIds}
                      onSelectionChange={(id, checked) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (checked) {
                            next.add(id);
                          } else {
                            next.delete(id);
                          }
                          return next;
                        });
                      }}
                      paidAppointmentIds={paidAppointmentIds}
                      cashAppointmentIds={cashAppointmentIds}
                      cardAppointmentIds={cardAppointmentIds}
                      onsiteOnlyPaymentAppointmentIds={onsiteOnlyPaymentAppointmentIds}
                      appointmentRateMap={appointmentRateMap}
                      onProviderViewProof={onProviderViewProof}
                      onPaymentInfo={onPaymentInfo}
                      onApprove={onApprove}
                      onCancel={onCancel}
                      navigate={navigate}
                      flaggedAppointmentIds={flaggedAppointmentIds}
                      onFlag={onFlag}
                      onUnflag={onUnflag}
                      flaggedCustomerIds={flaggedCustomerIds}
                      onFlagCustomer={handleOpenFlagCustomer}
                      onUnflagCustomer={handleUnflagCustomer}
                      isPremium={isPremium}
                      attendanceStats={apt.user_id ? attendanceStatsMap.get(apt.user_id) : undefined}
                    />
                  </React.Fragment>
                );
              });
            })()}
          </div>
        ) : (
          dateFilter !== 'all' ? (
            <p className="text-muted-foreground text-sm">No appointments for this period.</p>
          ) : groupedPendingByOpening.size === 0 ? (
            <Card className="shadow-soft border-card-border">
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">No active appointments</p>
              </CardContent>
            </Card>
          ) : null
        )}
      </div>

      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setShowInactive(!showInactive)}
          aria-expanded={showInactive}
          className="flex items-center space-x-2 p-0 h-auto hover:bg-transparent"
        >
          <h3 className="text-xl font-semibold text-foreground">Inactive Appointments</h3>
          {showInactive ? <ChevronUp className="h-5 w-5" aria-hidden="true" /> : <ChevronDown className="h-5 w-5" aria-hidden="true" />}
        </Button>
        {showInactive && (
          filteredInactive.length > 0 ? (
            <div className="space-y-4">
              {filteredInactive.map(a => (
                <AppointmentCard
                  key={a.id}
                  appointment={a}
                  isInactive
                  userId={userId}
                  selectedIds={selectedIds}
                  onSelectionChange={(id, checked) => {
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (checked) {
                        next.add(id);
                      } else {
                        next.delete(id);
                      }
                      return next;
                    });
                  }}
                  paidAppointmentIds={paidAppointmentIds}
                  cashAppointmentIds={cashAppointmentIds}
                  cardAppointmentIds={cardAppointmentIds}
                  onsiteOnlyPaymentAppointmentIds={onsiteOnlyPaymentAppointmentIds}
                  appointmentRateMap={appointmentRateMap}
                  onProviderViewProof={onProviderViewProof}
                  onPaymentInfo={onPaymentInfo}
                  onApprove={onApprove}
                  onCancel={onCancel}
                  navigate={navigate}
                  flaggedAppointmentIds={flaggedAppointmentIds}
                  onFlag={onFlag}
                  onUnflag={onUnflag}
                  flaggedCustomerIds={flaggedCustomerIds}
                  onFlagCustomer={handleOpenFlagCustomer}
                  onUnflagCustomer={handleUnflagCustomer}
                  isPremium={isPremium}
                  attendanceStats={a.user_id ? attendanceStatsMap.get(a.user_id) : undefined}
                />
              ))}
            </div>
          ) : (
            <Card className="shadow-soft border-card-border">
              <CardContent className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  {dateFilter !== 'all' ? 'No inactive appointments for this period.' : 'No inactive appointments'}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      <FlagCustomerDialog
        open={flagCustomerDialog.open}
        onOpenChange={handleCloseFlagCustomer}
        customerName={flagCustomerDialog.customerName}
        customerId={flagCustomerDialog.customerId}
        appointmentId={flagCustomerDialog.appointmentId || undefined}
        onFlag={handleFlagCustomer}
      />
    </div>
  );
}
