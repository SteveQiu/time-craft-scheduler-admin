import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Plus, Crown, Store, Loader2, List } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentMethod } from '@/hooks/usePaymentMethod';
import { PaymentMethodType } from '@/lib/payment/types';
import { useResources } from '@/hooks/useResources';
import { useCalendarProfile } from '@/hooks/useCalendarProfile';
import { useCalendarOpenings } from '@/hooks/useCalendarOpenings';
import { useCalendarActions } from '@/hooks/useCalendarActions';
import { useCalendarQueries } from '@/hooks/useCalendarQueries';
import { useWorkplaceAddresses } from '@/hooks/useWorkplaceAddresses';
import { useSubscription } from '@/hooks/useSubscription';
import type { LocationFields } from '@/lib/address';
import { CalendarGrid } from './calendar/CalendarGrid';
import { DaySlotsPanel } from './calendar/DaySlotsPanel';
import { OpeningFormDialog } from './calendar/OpeningFormDialog';
import { DeleteOpeningDialog } from './calendar/DeleteOpeningDialog';
import { EditOpeningDialog } from './calendar/EditOpeningDialog';
import { AddPaymentDialog } from './calendar/AddPaymentDialog';
import type { Opening, NewOpeningForm, EditOpeningForm } from './calendar/types';

export function Calendar() {
  const [isTogglingInquiry, setIsTogglingInquiry] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const queryClient = useQueryClient();
  const { resources } = useResources();

  const { ownProfile, selfResourceName } = useCalendarProfile({ user });

  // Build resource list: user themselves + resources from resources table
  const acceptedResources = React.useMemo(() => {
    const list: { id: string; resource_name: string; user_id: string }[] = [];
    if (ownProfile?.full_name) {
      list.push({ id: 'self', resource_name: ownProfile.full_name, user_id: user?.id || '' });
    }
    resources.forEach(r => {
      if (!list.some(w => w.resource_name === r.name)) {
        list.push({ id: r.id, resource_name: r.name, user_id: user?.id || '' });
      }
    });
    return list;
  }, [ownProfile, resources, user?.id]);

  // Rate/skills helpers that check resources first, then fall back to profile
  const getResourceRate = (name: string): number => {
    const resource = resources.find(r => r.name === name);
    if (resource?.hourly_rate != null) return resource.hourly_rate;
    return ownProfile?.hourly_rate || 0;
  };

  const getResourceSkills = (name: string): string[] => {
    if (name === ownProfile?.full_name) return ownProfile?.skills || [];
    return ownProfile?.skills || [];
  };

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [collapsedResources, setCollapsedResources] = useState<Set<string>>(new Set());
  const [selectedOpeningIds, setSelectedOpeningIds] = useState<Set<string>>(new Set());

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentFormLabel, setPaymentFormLabel] = useState('');
  const [paymentFormType, setPaymentFormType] = useState<string>(PaymentMethodType.Cash);
  const { details: paymentDetails, reset: resetPaymentDetails, serialize: serializePaymentDetails } = usePaymentMethod();

  const [editingOpening, setEditingOpening] = useState<Opening | null>(null);
  const [editForm, setEditForm] = useState<EditOpeningForm>({
    service: '', startTime: '', endTime: '', isFree: false, hourlyRate: 0, total: 0, acceptedPaymentMethodIds: [],
  });
  const [isEditSaving, setIsEditSaving] = useState(false);

  const [newOpening, setNewOpening] = useState<NewOpeningForm>(() => {
    let startTime = '09:00';
    let endTime = '';
    try {
      const cached = localStorage.getItem('pikappoint_opening_times');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.startTime) startTime = parsed.startTime;
        if (parsed.endTime) endTime = parsed.endTime;
      }
    } catch {}
    return {
    startTime, endTime: endTime, duration: 1, worker: '', service: '',
    locationFields: { address_line_1: '', address_line_2: '', city: '', province: '', country: '', zip: '' },
    multipleSlots: false, interval: 1, isFree: false, rateMode: 'default', customTotal: 0, multipleDates: false,
    dateRangeStart: '', dateRangeEnd: '', weekdays: new Set([0, 1, 2, 3, 4, 5, 6]),
    acceptedPaymentMethodIds: [],
    };
  });

  const { openings, setOpenings, loading, setLoading, confirmedOpeningIds, loadOpeningsForMonth } = useCalendarOpenings({ user });

  const { savedAddresses, providerPaymentMethods, savePaymentFromOpening } = useCalendarQueries({
    user, resetPaymentDetails, paymentFormLabel, paymentFormType,
    serializePaymentDetails, setShowPaymentDialog, setPaymentFormLabel, setPaymentFormType,
  });

  const { saveAddress: saveCustomAddress } = useWorkplaceAddresses(user?.id);

  const handleSaveCustomAddress = (label: string, fields: LocationFields) => {
    const addressJson = JSON.stringify({
      address_line_1: fields.address_line_1,
      address_line_2: fields.address_line_2,
      city: fields.city,
      province: fields.province,
      country: fields.country,
      zip: fields.zip,
    });
    if (user) {
      saveCustomAddress.mutate({ label, addressJson, userId: user.id });
    }
  };

  const {
    blockedOpenings, setBlockedOpenings, isBulkDeleting, safeIdsToDelete, setSafeIdsToDelete,
    showBulkDeleteConfirm, setShowBulkDeleteConfirm,
    navigateMonth, openEditDialog, resetForm, addOpening, saveEditOpening,
    removeOpening, deleteSafeOpenings, handleBulkDelete,
  } = useCalendarActions({
    user, selectedDate, currentDate, setCurrentDate, newOpening, setNewOpening,
    editForm, editingOpening, setEditingOpening, setEditForm, openings, setOpenings,
    selectedOpeningIds, setSelectedOpeningIds, setLoading, setIsEditSaving,
    loadOpeningsForMonth, getResourceRate: getResourceRate, selfResourceName, providerPaymentMethods,
    ownProfile, isPremium, getResourceSkills: getResourceSkills, acceptedResources, setErrors, setShowAddOpening,
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentDate && user) loadOpeningsForMonth(currentDate); }, [currentDate, user, acceptedResources]);

  useEffect(() => {
    if (acceptedResources.length > 0 && !newOpening.worker) {
      const firstResource = acceptedResources[0];
      const skills = getResourceSkills(firstResource.resource_name);
      setNewOpening(prev => ({ ...prev, worker: firstResource.resource_name, service: skills[0] || '' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownProfile, acceptedResources]);

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

  const handleToggleInquiry = async () => {
    if (!isPremium) {
      toast('Custom Inquiry is a premium feature', {
        description: 'Upgrade to premium to enable custom inquiry for your store.',
        action: {
          label: 'Upgrade',
          onClick: () => navigate('/settings?tab=subscription'),
        },
      });
      return;
    }
    if (!user || !ownProfile) return;
    setIsTogglingInquiry(true);
    try {
      const newValue = !ownProfile.custom_inquiry_open;
      const { error } = await supabase
        .from('profiles')
        .update({ custom_inquiry_open: newValue })
        .eq('id', user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['own-profile-for-openings', user?.id] });
      toast(newValue ? 'Store opened for custom inquiry' : 'Store closed for custom inquiry');
    } catch {
      toast.error('Failed to update custom inquiry setting');
    } finally {
      setIsTogglingInquiry(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-bold text-foreground">Opening</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => navigate('/openings/list')} variant="outline" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>List View</span>
          </Button>
          <Button onClick={() => setCurrentDate(new Date())} variant="outline" className="flex items-center space-x-2">
            <span>Today</span>
          </Button>
          {user && (
            <Button
              variant={ownProfile?.custom_inquiry_open ? 'default' : 'outline'}
              className={`flex items-center space-x-2 ${ownProfile?.custom_inquiry_open ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
              onClick={handleToggleInquiry}
              disabled={isTogglingInquiry}
            >
              {isTogglingInquiry ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPremium ? (
                <Store className="h-4 w-4" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              <span>Active Listing &amp; Custom Time</span>
            </Button>
          )}
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
          collapsedResources={collapsedResources}
          setCollapsedResources={setCollapsedResources}
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
        isPremium={isPremium}
        acceptedResources={acceptedResources}
        selfResourceName={selfResourceName}
        getResourceSkills={getResourceSkills}
        getResourceRate={getResourceRate}
        savedAddresses={savedAddresses}
        providerPaymentMethods={providerPaymentMethods}
        addOpening={addOpening}
        setShowPaymentDialog={setShowPaymentDialog}
        setPaymentFormLabel={setPaymentFormLabel}
        setPaymentFormType={setPaymentFormType}
        resetPaymentDetails={resetPaymentDetails}
        onSaveCustomAddress={handleSaveCustomAddress}
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
        selfResourceName={selfResourceName}
        getResourceRate={getResourceRate}
        getResourceSkills={getResourceSkills}
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
