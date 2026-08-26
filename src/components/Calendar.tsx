import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Plus, Crown, Store, Loader2, List, CalendarClock, ChevronDown } from 'lucide-react';
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
import { parseLocation, serializeLocation, type LocationFields } from '@/lib/address';
import { AUTOMATIC_OPENINGS_MAINTAINED_EVENT } from '@/lib/automaticSchedule';
import { CalendarGrid } from './calendar/CalendarGrid';
import { DaySlotsPanel } from './calendar/DaySlotsPanel';
import { OpeningFormDialog } from './calendar/OpeningFormDialog';
import { validateAutomaticScheduleForm } from './calendar/calendarUtils';
import { DeleteOpeningDialog } from './calendar/DeleteOpeningDialog';
import { EditOpeningDialog } from './calendar/EditOpeningDialog';
import { AddPaymentDialog } from './calendar/AddPaymentDialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { Opening, NewOpeningForm, EditOpeningForm } from './calendar/types';

const createOpeningForm = (): NewOpeningForm => {
  let startTime = '09:00';
  let endTime = '';
  try {
    const cached = localStorage.getItem('pikappoint_opening_times');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.startTime) startTime = parsed.startTime;
      if (parsed.endTime) endTime = parsed.endTime;
    }
  } catch {
    // Fall back to defaults when localStorage is unavailable or invalid.
  }

  return {
    startTime,
    endTime,
    duration: 1,
    worker: '',
    service: '',
    locationFields: { address_line_1: '', address_line_2: '', city: '', province: '', country: '', zip: '' },
    multipleSlots: false,
    interval: 1,
    isFree: false,
    rateMode: 'default',
    customTotal: 0,
    multipleDates: false,
    dateRangeStart: '',
    dateRangeEnd: '',
    weekdays: new Set([0, 1, 2, 3, 4, 5, 6]),
    acceptedPaymentMethodIds: [],
  };
};

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
  const [showAutomaticSchedule, setShowAutomaticSchedule] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [automaticErrors, setAutomaticErrors] = useState<{ [key: string]: string }>({});
  const [automaticLoading, setAutomaticLoading] = useState(false);
  const [automaticTemplateId, setAutomaticTemplateId] = useState<string | null>(null);
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

  const [newOpening, setNewOpening] = useState<NewOpeningForm>(createOpeningForm);
  const [automaticOpening, setAutomaticOpening] = useState<NewOpeningForm>(createOpeningForm);

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
    navigateMonth, openEditDialog, addOpening, saveEditOpening,
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
    const refreshOpenings = () => {
      void loadOpeningsForMonth(currentDate);
    };
    window.addEventListener(AUTOMATIC_OPENINGS_MAINTAINED_EVENT, refreshOpenings);
    return () => window.removeEventListener(AUTOMATIC_OPENINGS_MAINTAINED_EVENT, refreshOpenings);
  }, [currentDate, loadOpeningsForMonth]);

  useEffect(() => {
    if (acceptedResources.length > 0 && !newOpening.worker) {
      const firstResource = acceptedResources[0];
      const skills = getResourceSkills(firstResource.resource_name);
      setNewOpening(prev => ({ ...prev, worker: firstResource.resource_name, service: skills[0] || '' }));
    }
    if (acceptedResources.length > 0 && !automaticOpening.worker) {
      const firstResource = acceptedResources[0];
      const skills = getResourceSkills(firstResource.resource_name);
      setAutomaticOpening(prev => ({ ...prev, worker: firstResource.resource_name, service: skills[0] || '' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownProfile, acceptedResources, automaticOpening.worker]);

  useEffect(() => {
    if (providerPaymentMethods.length > 0) {
      setNewOpening(prev => ({
        ...prev,
        acceptedPaymentMethodIds: prev.acceptedPaymentMethodIds.length === 0
          ? providerPaymentMethods.map(pm => pm.id)
          : prev.acceptedPaymentMethodIds,
      }));
      setAutomaticOpening(prev => ({
        ...prev,
        acceptedPaymentMethodIds: prev.acceptedPaymentMethodIds.length === 0
          ? providerPaymentMethods.map(pm => pm.id)
          : prev.acceptedPaymentMethodIds,
      }));
    }
  }, [providerPaymentMethods]);

  const handleOpenAutomaticSchedule = async () => {
    if (!isPremium) {
      toast('Automatic scheduling is a premium feature', {
        description: 'Upgrade to premium to keep openings scheduled one month ahead.',
        action: {
          label: 'Upgrade',
          onClick: () => navigate('/settings?tab=subscription'),
        },
      });
      return;
    }

    setAutomaticErrors({});
    setAutomaticLoading(true);
    try {
      const { data: template, error } = await supabase
        .from('automatic_opening_templates')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      if (template) {
        const slotDuration = template.multiple_slots
          ? Number(template.interval_hours)
          : Number(template.duration);
        const defaultTotal = Number(getResourceRate(template.worker)) * slotDuration;
        const total = Number(template.total);
        const rateMode = total === 0
          ? 'free'
          : Math.abs(total - defaultTotal) < 0.005
            ? 'default'
            : 'custom';

        setAutomaticTemplateId(template.id);
        setAutomaticOpening({
          startTime: template.start_time.slice(0, 5),
          endTime: template.end_time?.slice(0, 5) ?? '',
          duration: Number(template.duration),
          worker: template.worker,
          service: template.service,
          locationFields: parseLocation(template.location),
          multipleSlots: template.multiple_slots,
          interval: Number(template.interval_hours),
          isFree: rateMode === 'free',
          rateMode,
          customTotal: rateMode === 'custom' ? total : 0,
          multipleDates: false,
          dateRangeStart: '',
          dateRangeEnd: '',
          weekdays: new Set(template.weekdays),
          acceptedPaymentMethodIds: template.accepted_payment_method_ids ?? [],
        });
      } else {
        const freshOpening = createOpeningForm();
        const defaultResource = acceptedResources[0]?.resource_name || ownProfile?.full_name || user?.email || '';
        freshOpening.worker = defaultResource;
        freshOpening.service = getResourceSkills(defaultResource)[0] || '';
        freshOpening.acceptedPaymentMethodIds = providerPaymentMethods.map(method => method.id);
        setAutomaticTemplateId(null);
        setAutomaticOpening(freshOpening);
      }

      setShowAutomaticSchedule(true);
    } catch (error) {
      console.error('Error loading automatic schedule:', error);
      toast.error('Failed to load automatic schedule');
    } finally {
      setAutomaticLoading(false);
    }
  };

  const saveAutomaticSchedule = async (): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to create an automatic schedule');
      return false;
    }
    if (!isPremium) {
      toast.error('Automatic scheduling requires premium');
      return false;
    }

    const validationErrors = validateAutomaticScheduleForm(automaticOpening);
    setAutomaticErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please fix validation errors');
      return false;
    }

    const slotDuration = automaticOpening.multipleSlots
      ? Number(automaticOpening.interval)
      : Number(automaticOpening.duration);
    const defaultRate = Number(getResourceRate(automaticOpening.worker)) || 0;
    const total = automaticOpening.rateMode === 'free'
      ? 0
      : automaticOpening.rateMode === 'custom'
        ? Number(automaticOpening.customTotal) || 0
        : defaultRate * slotDuration;
    const hourlyRate = slotDuration > 0 ? total / slotDuration : 0;

    setAutomaticLoading(true);
    try {
      const { data: insertedCount, error: schedulingError } = await supabase.rpc(
        'save_automatic_opening_schedule',
        {
          p_template_id: automaticTemplateId,
          p_start_time: automaticOpening.startTime,
          p_end_time: automaticOpening.multipleSlots ? automaticOpening.endTime : null,
          p_duration: automaticOpening.duration,
          p_interval_hours: automaticOpening.interval,
          p_multiple_slots: automaticOpening.multipleSlots,
          p_weekdays: Array.from(automaticOpening.weekdays).sort((a, b) => a - b),
          p_worker: automaticOpening.worker,
          p_service: automaticOpening.service,
          p_location: serializeLocation(automaticOpening.locationFields),
          p_hourly_rate: hourlyRate,
          p_total: total,
          p_accepted_payment_method_ids: automaticOpening.acceptedPaymentMethodIds.length > 0
          ? automaticOpening.acceptedPaymentMethodIds
          : null,
        },
      );
      if (schedulingError) throw schedulingError;

      await loadOpeningsForMonth(currentDate);
      const resetOpening = createOpeningForm();
      const defaultResource = acceptedResources[0]?.resource_name || ownProfile?.full_name || user.email || '';
      resetOpening.worker = defaultResource;
      resetOpening.service = getResourceSkills(defaultResource)[0] || '';
      resetOpening.acceptedPaymentMethodIds = providerPaymentMethods.map(method => method.id);
      setAutomaticOpening(resetOpening);
      setAutomaticTemplateId(null);
      setShowAutomaticSchedule(false);
      toast.success(`Automatic schedule saved. ${insertedCount ?? 0} openings added.`);
      return true;
    } catch (error) {
      console.error('Error saving automatic schedule:', error);
      toast.error('Failed to save automatic schedule');
      return false;
    } finally {
      setAutomaticLoading(false);
    }
  };

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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/openings/list')} variant="outline" className="flex items-center space-x-2">
              <List className="h-4 w-4" />
              <span>List View</span>
            </Button>
            <Button onClick={() => setCurrentDate(new Date())} variant="outline">
              Today
            </Button>
          </div>
          <div role="group" aria-label="Opening actions" className="inline-flex rounded-md shadow-sm">
            <Button
              onClick={() => setShowAddOpening(true)}
              className="gap-2 rounded-r-none"
              disabled={!user}
            >
              <Plus className="h-4 w-4" />
              <span>Add Opening</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="rounded-l-none border-l border-primary-foreground/25 px-2.5"
                  disabled={!user}
                  aria-label="More opening actions"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuItem
                  onSelect={() => void handleOpenAutomaticSchedule()}
                  disabled={automaticLoading}
                  className="items-start gap-3 py-2.5"
                >
                  {automaticLoading
                    ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                    : isPremium
                    ? <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    : <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />}
                  <span className="flex flex-col">
                    <span>Automatic Schedule</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Keep openings filled one month ahead
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuCheckboxItem
                  checked={Boolean(ownProfile?.custom_inquiry_open)}
                  onCheckedChange={() => void handleToggleInquiry()}
                  disabled={isTogglingInquiry}
                  className="items-start gap-3 py-2.5"
                >
                  {isTogglingInquiry
                    ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                    : isPremium
                    ? <Store className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    : <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />}
                  <span className="flex flex-col">
                    <span>Active Listing &amp; Custom Time</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Accept direct custom-time inquiries
                    </span>
                  </span>
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          isPremium={isPremium}
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

      <OpeningFormDialog
        showAddOpening={showAutomaticSchedule}
        setShowAddOpening={setShowAutomaticSchedule}
        selectedDate={selectedDate}
        errors={automaticErrors}
        setErrors={setAutomaticErrors}
        newOpening={automaticOpening}
        setNewOpening={setAutomaticOpening}
        loading={automaticLoading}
        user={user}
        isPremium={isPremium}
        acceptedResources={acceptedResources}
        selfResourceName={selfResourceName}
        getResourceSkills={getResourceSkills}
        getResourceRate={getResourceRate}
        savedAddresses={savedAddresses}
        providerPaymentMethods={providerPaymentMethods}
        automatic
        saveAutomaticSchedule={saveAutomaticSchedule}
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
