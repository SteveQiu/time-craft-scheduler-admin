import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { usePaymentMethod } from '@/hooks/usePaymentMethod';
import { useOrgWorkers } from '@/hooks/useOrgWorkers';
import { useCalendarProfile } from '@/hooks/useCalendarProfile';
import { useCalendarOpenings } from '@/hooks/useCalendarOpenings';
import { useCalendarActions } from '@/hooks/useCalendarActions';
import { useCalendarQueries } from '@/hooks/useCalendarQueries';
import { CalendarGrid } from './calendar/CalendarGrid';
import { DaySlotsPanel } from './calendar/DaySlotsPanel';
import { OpeningFormDialog } from './calendar/OpeningFormDialog';
import { DeleteOpeningDialog } from './calendar/DeleteOpeningDialog';
import { EditOpeningDialog } from './calendar/EditOpeningDialog';
import { AddPaymentDialog } from './calendar/AddPaymentDialog';
import type { Opening, NewOpeningForm, EditOpeningForm } from './calendar/types';

export function Calendar() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isOrganization, isInternalDev } = useUserRoles();
  const modeParam = searchParams.get('mode');
  const isOrgMode = modeParam === 'org' && (isOrganization || isInternalDev);
  const { workers: workerData, acceptedWorkers, getWorkerRate: getOrgWorkerRate, getWorkerSkills: getOrgWorkerSkills } = useOrgWorkers();

  const { ownProfile, getWorkerRate, getWorkerSkills, selfWorkerName } = useCalendarProfile({
    user, isOrgMode, getOrgWorkerRate, getOrgWorkerSkills,
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [collapsedWorkers, setCollapsedWorkers] = useState<Set<string>>(new Set());
  const [selectedOpeningIds, setSelectedOpeningIds] = useState<Set<string>>(new Set());

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentFormLabel, setPaymentFormLabel] = useState('');
  const [paymentFormType, setPaymentFormType] = useState('cash');
  const { details: paymentDetails, reset: resetPaymentDetails, serialize: serializePaymentDetails } = usePaymentMethod();

  const [editingOpening, setEditingOpening] = useState<Opening | null>(null);
  const [editForm, setEditForm] = useState<EditOpeningForm>({
    service: '', startTime: '', endTime: '', isFree: false, hourlyRate: 0, total: 0, acceptedPaymentMethodIds: [],
  });
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [newOpening, setNewOpening] = useState<NewOpeningForm>({
    startTime: '09:00', endTime: '', duration: 1, worker: '', service: '',
    locationFields: { address_line_1: '', address_line_2: '', city: '', province: '', country: '', zip: '' },
    multipleSlots: false, interval: 1, isFree: false, rateMode: 'default', customTotal: 0, multipleDates: false,
    dateRangeStart: '', dateRangeEnd: '', weekdays: new Set([0, 1, 2, 3, 4, 5, 6]),
    acceptedPaymentMethodIds: [],
  });

  const { openings, setOpenings, loading, setLoading, confirmedOpeningIds, loadOpeningsForMonth } = useCalendarOpenings({ user, isOrgMode });

  const { savedAddresses, providerPaymentMethods, savePaymentFromOpening } = useCalendarQueries({
    user, resetPaymentDetails, paymentFormLabel, paymentFormType,
    serializePaymentDetails, setShowPaymentDialog, setPaymentFormLabel, setPaymentFormType,
  });

  const {
    blockedOpenings, setBlockedOpenings, isBulkDeleting, safeIdsToDelete, setSafeIdsToDelete,
    showBulkDeleteConfirm, setShowBulkDeleteConfirm,
    navigateMonth, openEditDialog, resetForm, addOpening, saveEditOpening,
    removeOpening, deleteSafeOpenings, handleBulkDelete,
  } = useCalendarActions({
    user, isOrgMode, selectedDate, currentDate, setCurrentDate, newOpening, setNewOpening,
    editForm, editingOpening, setEditingOpening, setEditForm, openings, setOpenings,
    selectedOpeningIds, setSelectedOpeningIds, setLoading, setIsEditSaving,
    loadOpeningsForMonth, getWorkerRate, selfWorkerName, providerPaymentMethods,
    workerData, ownProfile, getOrgWorkerSkills, acceptedWorkers, setErrors, setShowAddOpening,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentDate && user) loadOpeningsForMonth(currentDate); }, [currentDate, user, isOrgMode, acceptedWorkers]);

  useEffect(() => {
    if (!isOrgMode && ownProfile) {
      setNewOpening(prev => ({
        ...prev,
        worker: ownProfile.full_name || '',
        service: prev.service || (ownProfile.skills?.[0] || ''),
      }));
    } else if (isOrgMode && acceptedWorkers.length > 0 && !newOpening.worker) {
      const firstWorker = acceptedWorkers[0];
      const skills = getOrgWorkerSkills(firstWorker.worker_name);
      setNewOpening(prev => ({ ...prev, worker: firstWorker.worker_name, service: skills[0] || '' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgMode, ownProfile, acceptedWorkers]);

  useEffect(() => {
    if (providerPaymentMethods.length > 0) {
      setNewOpening(prev => ({
        ...prev,
        acceptedPaymentMethodIds: prev.acceptedPaymentMethodIds.length === 0
          ? providerPaymentMethods.map(pm => pm.id)
          : prev.acceptedPaymentMethodIds,
      }));
    }
  }, [providerPaymentMethods]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Opening</h2>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCurrentDate(new Date())} variant="outline" className="flex items-center space-x-2">
            <span>Today</span>
          </Button>
          <Button onClick={() => setShowAddOpening(true)} className="flex items-center space-x-2" disabled={!user}>
            <Plus className="h-4 w-4" />
            <span>Add Opening</span>
          </Button>
        </div>
      </div>

      {!user && (
        <div className="bg-warning/10 border border-warning text-black p-4 rounded-lg">
          Please sign in to manage your openings.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          setSelectedOpeningIds={setSelectedOpeningIds}
          loading={loading}
          openings={openings}
          navigateMonth={navigateMonth}
        />
        <DaySlotsPanel
          selectedDate={selectedDate}
          openings={openings}
          user={user}
          collapsedWorkers={collapsedWorkers}
          setCollapsedWorkers={setCollapsedWorkers}
          selectedOpeningIds={selectedOpeningIds}
          setSelectedOpeningIds={setSelectedOpeningIds}
          isBulkDeleting={isBulkDeleting}
          handleBulkDelete={handleBulkDelete}
          confirmedOpeningIds={confirmedOpeningIds}
          removeOpening={removeOpening}
          openEditDialog={openEditDialog}
        />
      </div>

      <OpeningFormDialog
        showAddOpening={showAddOpening}
        setShowAddOpening={setShowAddOpening}
        selectedDate={selectedDate}
        errors={errors}
        setErrors={setErrors}
        newOpening={newOpening}
        setNewOpening={setNewOpening}
        loading={loading}
        user={user}
        isOrgMode={isOrgMode}
        acceptedWorkers={acceptedWorkers}
        selfWorkerName={selfWorkerName}
        getWorkerSkills={getWorkerSkills}
        getWorkerRate={getWorkerRate}
        savedAddresses={savedAddresses}
        providerPaymentMethods={providerPaymentMethods}
        addOpening={addOpening}
        setShowPaymentDialog={setShowPaymentDialog}
        setPaymentFormLabel={setPaymentFormLabel}
        setPaymentFormType={setPaymentFormType}
        resetPaymentDetails={resetPaymentDetails}
      />

      <DeleteOpeningDialog
        showBulkDeleteConfirm={showBulkDeleteConfirm}
        setShowBulkDeleteConfirm={setShowBulkDeleteConfirm}
        blockedOpenings={blockedOpenings}
        setBlockedOpenings={setBlockedOpenings}
        safeIdsToDelete={safeIdsToDelete}
        setSafeIdsToDelete={setSafeIdsToDelete}
        deleteSafeOpenings={deleteSafeOpenings}
      />

      <EditOpeningDialog
        editingOpening={editingOpening}
        setEditingOpening={setEditingOpening}
        editForm={editForm}
        setEditForm={setEditForm}
        isEditSaving={isEditSaving}
        saveEditOpening={saveEditOpening}
        isOrgMode={isOrgMode}
        selfWorkerName={selfWorkerName}
        getWorkerRate={getWorkerRate}
        getWorkerSkills={getWorkerSkills}
        providerPaymentMethods={providerPaymentMethods}
        setShowPaymentDialog={setShowPaymentDialog}
        setPaymentFormLabel={setPaymentFormLabel}
        setPaymentFormType={setPaymentFormType}
        resetPaymentDetails={resetPaymentDetails}
      />

      <AddPaymentDialog
        showPaymentDialog={showPaymentDialog}
        setShowPaymentDialog={setShowPaymentDialog}
        paymentFormLabel={paymentFormLabel}
        setPaymentFormLabel={setPaymentFormLabel}
        paymentFormType={paymentFormType}
        setPaymentFormType={setPaymentFormType}
        paymentDetails={paymentDetails}
        resetPaymentDetails={resetPaymentDetails}
        savePaymentFromOpening={savePaymentFromOpening}
      />
    </div>
  );
}
