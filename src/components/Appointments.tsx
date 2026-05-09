import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from './ui/card';
import { Loader2 } from 'lucide-react';
import { useOrgWorkers } from '@/hooks/useOrgWorkers';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import { useAppointments } from '@/hooks/useAppointments';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useAppointmentRates } from '@/hooks/useAppointmentRates';
import { useProviderPayments } from '@/hooks/useProviderPayments';
import { usePaymentProof } from '@/hooks/usePaymentProof';
import { useAppointmentActions } from '@/hooks/useAppointmentActions';
import { useAppointmentFiltering } from '@/hooks/useAppointmentFiltering';
import { DateFilter } from './appointments/calendarExport';
import { AppointmentFilters } from './appointments/AppointmentFilters';
import { AppointmentList } from './appointments/AppointmentList';
import { BulkModifyDialog } from './appointments/BulkModifyDialog';
import { PaymentInfoDialog } from './appointments/PaymentInfoDialog';
import { ProviderProofDialog } from './appointments/ProviderProofDialog';
import { NotificationBadge } from './appointments/NotificationBadge';

export function Appointments() {
  const { workers, acceptedWorkers, getWorkerRate } = useOrgWorkers();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isOrganization, isInternalDev } = useUserRoles();
  const queryClient = useQueryClient();

  const { permissionStatus } = useAppointmentNotifications({
    userId: user?.id,
    enabled: !isOrganization && !isInternalDev,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentInfoProviderId, setPaymentInfoProviderId] = useState<string | null>(null);
  const [paymentInfoProviderName, setPaymentInfoProviderName] = useState<string>('');
  const [paymentInfoOpeningId, setPaymentInfoOpeningId] = useState<string | null>(null);
  const [paymentProofAppointmentId, setPaymentProofAppointmentId] = useState<string | null>(null);
  const [providerViewProofAppointmentId, setProviderViewProofAppointmentId] = useState<string | null>(null);
  const [selectedPaymentTabId, setSelectedPaymentTabId] = useState<string | null>(null);

  const modeParam = searchParams.get('mode');
  const isOrgView = modeParam === 'org' && (isOrganization || isInternalDev);
  const { data: appointments = [], isLoading } = useAppointments({ userId: user?.id, isOrgView, acceptedWorkers });
  const appointmentIds = useMemo(() => appointments.map(a => a.id), [appointments]);
  const { paidAppointmentIds, cashAppointmentIds } = usePaymentStatus(appointmentIds);
  const { appointmentRateMap } = useAppointmentRates(appointmentIds);

  const {
    allAvailableMethods,
    activePaymentMethod,
    loadingProviderPayments,
    loadingOrgPayments,
    loadingPaymentInfoOpening,
  } = useProviderPayments({
    providerId: paymentInfoProviderId,
    openingId: paymentInfoOpeningId,
    selectedPaymentTabId,
  });

  const {
    existingPaymentProof,
    providerViewProof,
    loadingExistingProof,
    loadingProviderProof,
    paymentProofNote,
    setPaymentProofNote,
    paymentProofPhoto,
    setPaymentProofPhoto,
    paymentProofPhotoName,
    setPaymentProofPhotoName,
    setPaymentProofPhotoFile,
    proofSubmitted,
    setProofSubmitted,
    proofImageError,
    setProofImageError,
    providerViewSignedUrl,
    providerViewSignedUrlLoading,
    isSubmittingProof,
    handlePaymentPhotoUpload,
    handleSubmitPaymentProof,
  } = usePaymentProof({
    paymentProofAppointmentId,
    providerViewProofAppointmentId,
    activePaymentMethod,
  });

  const {
    selectedIds,
    setSelectedIds,
    isBulkActing,
    bulkModifyQueue,
    setBulkModifyQueue,
    bulkModifyIndex,
    setBulkModifyIndex,
    showBulkModifyDialog,
    setShowBulkModifyDialog,
    bulkModifyAvailableOpenings,
    bulkModifyLoadingOpenings,
    bulkModifyModifying,
    handleApprove,
    handleCancel,
    handleBulkApprove,
    handleBulkCancel,
    handleBulkComplete,
    advanceBulkModifyQueue,
    handleStartBulkModify,
    handleBulkModifyOne,
  } = useAppointmentActions({ user, isOrgView, appointments, queryClient });

  const {
    activeAppointments,
    filteredNonPendingActive,
    filteredInactive,
    groupedPendingByOpening,
  } = useAppointmentFiltering({
    appointments,
    searchTerm,
    statusFilter,
    workerFilter,
    dateFilter,
    isOrgView,
  });

  if (authLoading) {
    return (
      <div className="p-6 flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card><CardContent className="text-center py-12">
          <p className="text-muted-foreground">Please sign in to view appointments.</p>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Reservations
            </h2>
            <p className="text-muted-foreground">
              {isOrgView ? 'Review and manage all bookings' : 'Your booked reservations'}
            </p>
          </div>

          {/* Notification status indicator */}
          {!isOrgView && <NotificationBadge permissionStatus={permissionStatus} />}
        </div>

        <AppointmentFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          workerFilter={workerFilter}
          setWorkerFilter={setWorkerFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          isOrgView={isOrgView}
          workers={workers}
          onFilterChange={() => setSelectedIds(new Set())}
        />

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <AppointmentList
            activeAppointments={activeAppointments}
            filteredNonPendingActive={filteredNonPendingActive}
            filteredInactive={filteredInactive}
            isOrgView={isOrgView}
            userId={user?.id}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            paidAppointmentIds={paidAppointmentIds}
            cashAppointmentIds={cashAppointmentIds}
            appointmentRateMap={appointmentRateMap}
            getWorkerRate={getWorkerRate}
            groupedPendingByOpening={groupedPendingByOpening}
            dateFilter={dateFilter}
            showInactive={showInactive}
            setShowInactive={setShowInactive}
            onProviderViewProof={(id) => setProviderViewProofAppointmentId(id)}
            onPaymentInfo={(providerId, providerName, openingId, appointmentId) => {
              setPaymentInfoProviderId(providerId);
              setPaymentInfoProviderName(providerName);
              setPaymentInfoOpeningId(openingId);
              setPaymentProofAppointmentId(appointmentId);
              setProofSubmitted(false);
            }}
            onApprove={handleApprove}
            onCancel={handleCancel}
            navigate={navigate}
            isBulkActing={isBulkActing}
            isLoading={isLoading}
            onBulkApprove={handleBulkApprove}
            onBulkCancel={handleBulkCancel}
            onBulkComplete={handleBulkComplete}
            onStartBulkModify={handleStartBulkModify}
            onExport={() => {}}
            appointments={appointments}
          />
        )}

        <BulkModifyDialog
          open={showBulkModifyDialog && !!bulkModifyQueue[bulkModifyIndex]}
          onOpenChange={(open) => {
            if (!open) {
              setShowBulkModifyDialog(false);
              setBulkModifyQueue([]);
              setBulkModifyIndex(0);
            }
          }}
          bulkModifyQueue={bulkModifyQueue}
          bulkModifyIndex={bulkModifyIndex}
          bulkModifyAvailableOpenings={bulkModifyAvailableOpenings}
          bulkModifyLoadingOpenings={bulkModifyLoadingOpenings}
          bulkModifyModifying={bulkModifyModifying}
          onSkip={advanceBulkModifyQueue}
          onSelect={handleBulkModifyOne}
        />

        <PaymentInfoDialog
          paymentInfoProviderId={paymentInfoProviderId}
          paymentInfoProviderName={paymentInfoProviderName}
          onClose={() => {
            setPaymentInfoProviderId(null);
            setPaymentInfoOpeningId(null);
            setProofSubmitted(false);
            setPaymentProofNote('');
            setPaymentProofPhoto(null);
            setPaymentProofPhotoName('');
            setSelectedPaymentTabId(null);
          }}
          loadingProviderPayments={loadingProviderPayments}
          loadingOrgPayments={loadingOrgPayments}
          loadingPaymentInfoOpening={loadingPaymentInfoOpening}
          allAvailableMethods={allAvailableMethods}
          selectedPaymentTabId={selectedPaymentTabId}
          setSelectedPaymentTabId={setSelectedPaymentTabId}
          activePaymentMethod={activePaymentMethod}
          proofSubmitted={proofSubmitted}
          setProofSubmitted={setProofSubmitted}
          loadingExistingProof={loadingExistingProof}
          existingPaymentProof={existingPaymentProof}
          paymentProofNote={paymentProofNote}
          setPaymentProofNote={setPaymentProofNote}
          paymentProofPhoto={paymentProofPhoto}
          setPaymentProofPhoto={setPaymentProofPhoto}
          paymentProofPhotoName={paymentProofPhotoName}
          setPaymentProofPhotoName={setPaymentProofPhotoName}
          setPaymentProofPhotoFile={setPaymentProofPhotoFile}
          isSubmittingProof={isSubmittingProof}
          handlePaymentPhotoUpload={handlePaymentPhotoUpload}
          handleSubmitPaymentProof={handleSubmitPaymentProof}
        />

        <ProviderProofDialog
          providerViewProofAppointmentId={providerViewProofAppointmentId}
          appointments={appointments}
          onClose={() => {
            setProviderViewProofAppointmentId(null);
            setProofImageError(false);
            // providerViewSignedUrl/Loading reset automatically via effect in usePaymentProof
          }}
          providerViewProof={providerViewProof}
          loadingProviderProof={loadingProviderProof}
          proofImageError={proofImageError}
          setProofImageError={setProofImageError}
          providerViewSignedUrl={providerViewSignedUrl}
          providerViewSignedUrlLoading={providerViewSignedUrlLoading}
        />
      </div>
    </div>
  );
}
