import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { ChevronLeft, ChevronRight, Plus, Clock, User, X, DollarSign, ChevronDown, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useQuery } from '@tanstack/react-query';
import { useOrgWorkers } from '@/hooks/useOrgWorkers';
import { parseLocation, formatLocation, serializeLocation, type LocationFields } from '@/lib/address';
import { AddressInput } from '@/components/ui/AddressInput';

interface TimeSlot {
  id: string;
  time: string;
  worker: string;
  service: string;
  client?: string;
  status: 'available' | 'booked' | 'blocked';
}

interface Opening {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  worker: string;
  service: string;
  is_available: boolean;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
  accepted_payment_method_ids?: string[] | null;
}

export function Calendar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOrganization, isInternalDev } = useUserRoles();
  const modeParam = searchParams.get('mode');
  const isOrgMode = modeParam === 'org' && (isOrganization || isInternalDev);
  const { workers: workerData, acceptedWorkers, getWorkerRate: getOrgWorkerRate, getWorkerSkills: getOrgWorkerSkills } = useOrgWorkers();

  // Fetch own profile for user mode (skills & rate)
  const { data: ownProfile } = useQuery({
    queryKey: ['own-profile-for-openings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, skills, hourly_rate')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as { full_name: string | null; skills: string[]; hourly_rate: number };
    },
    enabled: !!user && !isOrgMode,
  });

  const getWorkerRate = (name: string) => {
    if (isOrgMode) return getOrgWorkerRate(name);
    return ownProfile?.hourly_rate ?? 0;
  };

  const getWorkerSkills = (name: string) => {
    if (isOrgMode) return getOrgWorkerSkills(name);
    return ownProfile?.skills ?? [];
  };

  const selfWorkerName = ownProfile?.full_name || user?.email || 'Me';
  // Helper to parse time string (e.g., '09:00') to minutes since midnight
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const startMinutes = parseTime(startTime);
    const endMinutes = startMinutes + duration * 60;
    return formatTime(endMinutes);
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [collapsedWorkers, setCollapsedWorkers] = useState<Set<string>>(new Set());
  const [selectedOpeningIds, setSelectedOpeningIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [blockedOpenings, setBlockedOpenings] = useState<Opening[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [safeIdsToDelete, setSafeIdsToDelete] = useState<string[]>([]);

  // Fetch saved workplace addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['workplace-addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplace_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  // Fetch provider's own payment methods for the opening payment selector
  const { data: providerPaymentMethods = [] } = useQuery({
    queryKey: ['provider-payment-methods-for-opening', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, label, type')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as { id: string; label: string; type: string }[];
    },
    enabled: !!user,
  });

  // Edit opening state
  const [editingOpening, setEditingOpening] = useState<Opening | null>(null);
  const [editForm, setEditForm] = useState({
    service: '',
    startTime: '',
    endTime: '',
    isFree: false,
    hourlyRate: 0,
    acceptedPaymentMethodIds: [] as string[],
  });
  const [isEditSaving, setIsEditSaving] = useState(false);

  const openEditDialog = (opening: Opening) => {
    setEditingOpening(opening);
    setEditForm({
      service: opening.service,
      startTime: opening.start_time.slice(0, 5),
      endTime: opening.end_time.slice(0, 5),
      isFree: Number(opening.hourly_rate) === 0,
      hourlyRate: Number(opening.hourly_rate),
      acceptedPaymentMethodIds: opening.accepted_payment_method_ids ?? [],
    });
  };

  const saveEditOpening = async () => {
    if (!editingOpening) return;
    setIsEditSaving(true);
    try {
      const { error } = await supabase
        .from('openings')
        .update({
          service: editForm.service,
          start_time: editForm.startTime,
          end_time: editForm.endTime,
          hourly_rate: editForm.isFree ? 0 : editForm.hourlyRate,
          accepted_payment_method_ids: editForm.acceptedPaymentMethodIds.length > 0
            ? editForm.acceptedPaymentMethodIds
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingOpening.id);
      if (error) throw error;
      setOpenings(prev => prev.map(o =>
        o.id === editingOpening.id
          ? {
              ...o,
              service: editForm.service,
              start_time: editForm.startTime,
              end_time: editForm.endTime,
              hourly_rate: editForm.isFree ? 0 : editForm.hourlyRate,
              accepted_payment_method_ids: editForm.acceptedPaymentMethodIds.length > 0
                ? editForm.acceptedPaymentMethodIds
                : null,
            }
          : o
      ));
      toast.success('Opening updated');
      setEditingOpening(null);
    } catch {
      toast.error('Failed to update opening');
    } finally {
      setIsEditSaving(false);
    }
  };

  const [newOpening, setNewOpening] = useState({
    startTime: '09:00',
    endTime: '',
    duration: 1,
    worker: '',
    service: '',
    locationFields: { city: '', province: '', country: '', zip: '' } as LocationFields,
    multipleSlots: false,
    interval: 1,
    isFree: false,
    multipleDates: false,
    dateRangeStart: '',
    dateRangeEnd: '',
    weekdays: new Set([0, 1, 2, 3, 4, 5, 6]), // Sun-Sat, all selected by default
    acceptedPaymentMethodIds: [] as string[],
  });

  // Auto-set defaults when profile/workers load
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
      setNewOpening(prev => ({
        ...prev,
        worker: firstWorker.worker_name,
        service: skills[0] || '',
      }));
    }
  }, [isOrgMode, ownProfile, acceptedWorkers]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load all openings for the selected month once
  useEffect(() => {
    if (currentDate && user) {
      loadOpeningsForMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, user, isOrgMode, acceptedWorkers]);

  // Only fetch once per month, store all in state
  const loadOpeningsForMonth = async () => {
    if (!currentDate || !user) return;
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startStr = firstDay.toISOString().split('T')[0];
      const endStr = lastDay.toISOString().split('T')[0];
      let query = supabase
        .from('openings')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date')
        .order('start_time');

      // In user mode, only fetch own openings
      if (!isOrgMode) {
        query = query.eq('user_id', user.id);
      } else if (isOrgMode) {
        // In org mode, fetch openings created by this org (user_id = org owner)
        // Openings are created with user_id = org owner's ID
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOpenings(data || []);
    } catch (error) {
      console.error('Error loading openings:', error);
      toast.error('Failed to load openings');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!newOpening.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (isOrgMode && !newOpening.worker) {
      newErrors.worker = 'Worker selection is required';
    }
    
    if (!newOpening.service) {
      newErrors.service = 'Service selection is required';
    }
    
    if (!newOpening.locationFields.city || !newOpening.locationFields.city.trim()) {
      newErrors.location = 'City is required';
    }
    
    if (newOpening.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }
    
    if (newOpening.multipleSlots && newOpening.interval <= 0) {
      newErrors.interval = 'Interval must be greater than 0';
    }
    
    if (newOpening.multipleSlots && !newOpening.endTime) {
      newErrors.endTime = 'End time is required for multiple slots';
    }

    if (newOpening.multipleDates && !newOpening.dateRangeStart) {
      newErrors.dateRangeStart = 'Start date is required';
    }

    if (newOpening.multipleDates && !newOpening.dateRangeEnd) {
      newErrors.dateRangeEnd = 'End date is required';
    }

    // Check that start date is not earlier than today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newOpening.multipleDates && newOpening.dateRangeStart) {
      const startDate = new Date(newOpening.dateRangeStart);
      startDate.setHours(0, 0, 0, 0);
      if (startDate < today) {
        newErrors.dateRangeStart = 'Start date cannot be earlier than today';
      }
    }

    if (newOpening.multipleDates && newOpening.dateRangeStart && newOpening.dateRangeEnd) {
      const startDate = new Date(newOpening.dateRangeStart);
      const endDate = new Date(newOpening.dateRangeEnd);
      if (startDate > endDate) {
        newErrors.dateRangeEnd = 'End date must be after start date';
      }
    }
    
    // Check that single selected date is not earlier than today
    if (!newOpening.multipleDates) {
      const selectedDateOnly = new Date(selectedDate);
      selectedDateOnly.setHours(0, 0, 0, 0);
      if (selectedDateOnly < today) {
        newErrors.date = 'Cannot add openings to past dates';
      }
    }

    if (newOpening.multipleDates && newOpening.weekdays.size === 0) {
      newErrors.weekdays = 'At least one day must be selected';
    }
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (newOpening.startTime && !timeRegex.test(newOpening.startTime)) {
      newErrors.startTime = 'Invalid time format';
    }
    
    if (newOpening.multipleSlots && newOpening.endTime && !timeRegex.test(newOpening.endTime)) {
      newErrors.endTime = 'Invalid time format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return date1.toDateString() === date2.toDateString();
  };

  // Use only stored openings for per-date display
  const getOpeningsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return openings.filter(opening => opening.date === dateStr);
  };

  const hasOpenings = (date: Date | null) => {
    if (!date) return false;
    return getOpeningsForDate(date).length > 0;
  };

  // Get worker's user_id for org mode
  const getWorkerUserId = (name: string): string | null => {
    if (!isOrgMode) return user?.id || null;
    const worker = acceptedWorkers.find(w => w.worker_name === name);
    return worker?.user_id || null;
  };

  // --- addOpening function restored below ---
  const addOpening = async () => {
    if (!user) {
      toast.error('Please sign in to add openings');
      return;
    }
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    setLoading(true);
    const workerName = isOrgMode ? newOpening.worker : selfWorkerName;
    // In org mode, openings.user_id stores the org owner's ID (for RLS policy)
    // In user mode, it stores the individual provider's ID
    const workerUserId = isOrgMode ? user.id : getWorkerUserId(workerName);
    
    if (isOrgMode && !workerUserId) {
      toast.error('Selected worker has no user account yet');
      setLoading(false);
      return;
    }
    
    try {
        if (newOpening.multipleDates && newOpening.dateRangeStart && newOpening.dateRangeEnd) {
          // Create multiple openings for selected dates and weekdays
          // Can also combine with multiple time slots
          const newOpenings = [];
          const rateValue = newOpening.isFree ? 0 : Number(getWorkerRate(workerName));
          
          // Parse dates properly from YYYY-MM-DD format (avoiding timezone issues)
          const [startYear, startMonth, startDay] = newOpening.dateRangeStart.split('-').map(Number);
          const [endYear, endMonth, endDay] = newOpening.dateRangeEnd.split('-').map(Number);
          const startDate = new Date(startYear, startMonth - 1, startDay);
          const endDate = new Date(endYear, endMonth - 1, endDay);
          
          // Iterate through date range
          const current = new Date(startDate);
          while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (newOpening.weekdays.has(dayOfWeek)) {
              // Format date as YYYY-MM-DD without timezone conversion
              const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
              
              // If also using multiple time slots, create all time slots for this date
              if (newOpening.multipleSlots && newOpening.endTime) {
                const start = parseTime(newOpening.startTime);
                const end = parseTime(newOpening.endTime);
                let timeSlot = start;
                while (timeSlot < end) {
                  const startTimeStr = formatTime(timeSlot);
                  const endTimeStr = calculateEndTime(startTimeStr, newOpening.interval);
                  
                  newOpenings.push({
                    user_id: workerUserId,
                    date: dateStr,
                    start_time: startTimeStr,
                    end_time: endTimeStr,
                    duration: newOpening.interval,
                    worker: workerName,
                    service: newOpening.service,
                    location: serializeLocation(newOpening.locationFields),
                    is_available: true,
                    hourly_rate: rateValue,
                    accepted_payment_method_ids: newOpening.acceptedPaymentMethodIds.length > 0
                      ? newOpening.acceptedPaymentMethodIds
                      : null,
                  });
                  timeSlot += newOpening.interval * 60; // Add interval in minutes
                }
              } else {
                // Single time slot per date
                const startTimeStr = newOpening.startTime;
                const endTimeStr = calculateEndTime(startTimeStr, newOpening.duration);
                
                newOpenings.push({
                  user_id: workerUserId,
                  date: dateStr,
                  start_time: startTimeStr,
                  end_time: endTimeStr,
                  duration: newOpening.duration,
                  worker: workerName,
                  service: newOpening.service,
                  location: serializeLocation(newOpening.locationFields),
                  is_available: true,
                  hourly_rate: rateValue,
                  accepted_payment_method_ids: newOpening.acceptedPaymentMethodIds.length > 0
                    ? newOpening.acceptedPaymentMethodIds
                    : null,
                });
              }
            }
            current.setDate(current.getDate() + 1);
          }
          
          if (newOpenings.length > 0) {
            const { error } = await supabase
              .from('openings')
              .insert(newOpenings);
            if (error) throw error;
            toast.success(`${newOpenings.length} openings added successfully`);
          } else {
            toast.warning('No dates found matching the selected criteria');
          }
        } else if (newOpening.multipleSlots && newOpening.endTime) {
          // Create multiple slots with intervals for a single date
          const dateStr = selectedDate.toISOString().split('T')[0];
          const newOpenings = [];
          const start = parseTime(newOpening.startTime);
          const end = parseTime(newOpening.endTime);
          let current = start;
          while (current < end) {
            const startTimeStr = formatTime(current);
            const endTimeStr = calculateEndTime(startTimeStr, newOpening.interval);
            const rateValue = newOpening.isFree ? 0 : Number(getWorkerRate(workerName));
            newOpenings.push({
              user_id: workerUserId,
              date: dateStr,
              start_time: startTimeStr,
              end_time: endTimeStr,
              duration: newOpening.interval,
              worker: workerName,
              service: newOpening.service,
              location: serializeLocation(newOpening.locationFields),
              is_available: true,
              hourly_rate: rateValue,
              accepted_payment_method_ids: newOpening.acceptedPaymentMethodIds.length > 0
                ? newOpening.acceptedPaymentMethodIds
                : null,
            });
            current += newOpening.interval * 60; // Add interval in minutes
          }
          const { error } = await supabase
            .from('openings')
            .insert(newOpenings);
          if (error) throw error;
          toast.success(`${newOpenings.length} openings added successfully`);
        } else {
          // Create single slot
          const dateStr = selectedDate.toISOString().split('T')[0];
          const rateValue = newOpening.isFree ? 0 : Number(getWorkerRate(workerName));
          const opening = {
            user_id: workerUserId,
            date: dateStr,
            start_time: newOpening.startTime,
            end_time: calculateEndTime(newOpening.startTime, newOpening.duration),
            duration: newOpening.duration,
            worker: workerName,
            service: newOpening.service,
            location: serializeLocation(newOpening.locationFields),
            is_available: true,
            hourly_rate: rateValue,
            accepted_payment_method_ids: newOpening.acceptedPaymentMethodIds.length > 0
              ? newOpening.acceptedPaymentMethodIds
              : null,
          };
          const { error } = await supabase
            .from('openings')
            .insert([opening]);
          if (error) throw error;
          toast.success('Opening added successfully');
        }
        // Refresh all openings for the month after add
        await loadOpeningsForMonth();
        resetForm();
        setShowAddOpening(false);
      } catch (error) {
        console.error('Error adding opening:', error);
        toast.error('Failed to add opening');
      } finally {
        setLoading(false);
      }
    };
// ...existing code...

  const resetForm = () => {
    const defaultWorker = isOrgMode
      ? (workerData[0]?.worker_name || '')
      : (ownProfile?.full_name || user?.email || '');
    const defaultSkills = isOrgMode
      ? getOrgWorkerSkills(defaultWorker)
      : (ownProfile?.skills || []);
    setNewOpening({ 
      startTime: '09:00', 
      endTime: '',
      duration: 1, 
      worker: defaultWorker, 
      service: defaultSkills[0] || '',
      locationFields: { city: '', province: '', country: '', zip: '' },
      multipleSlots: false,
      interval: 1,
      isFree: false,
      multipleDates: false,
      dateRangeStart: '',
      dateRangeEnd: '',
      weekdays: new Set([0, 1, 2, 3, 4, 5, 6]),
      acceptedPaymentMethodIds: [],
    });
    setErrors({});
  };

  const removeOpening = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to remove openings');
      return;
    }

    try {
      // In user mode, only delete own openings. In org mode, RLS will validate authorization
      let query = supabase.from('openings').delete().eq('id', id);
      
      if (!isOrgMode) {
        query = query.eq('user_id', user.id);
      }

      const { error } = await query;

      if (error) throw error;
      
      // Instead of reloading everything, just remove from local state
      // This is faster and more reliable than re-fetching
      setOpenings(prev => prev.filter(opening => opening.id !== id));
      
      toast.success('Opening removed successfully');
    } catch (error) {
      console.error('Error removing opening:', error);
      toast.error('Failed to remove opening');
      // On error, reload to ensure we have latest data
      await loadOpeningsForMonth();
    }
  };

  const deleteSafeOpenings = async (ids: string[]) => {
    if (ids.length === 0) return;
    let query = supabase.from('openings').delete().in('id', ids);
    if (!isOrgMode) query = query.eq('user_id', user!.id);
    const { error } = await query;
    if (error) throw error;
    setOpenings(prev => prev.filter(o => !ids.includes(o.id)));
    setSelectedOpeningIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
    toast.success(`${ids.length} opening(s) deleted`);
  };

  const handleBulkDelete = async () => {
    if (!user || selectedOpeningIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const { data: blocked } = await supabase
        .from('appointments')
        .select('opening_id')
        .in('opening_id', Array.from(selectedOpeningIds))
        .in('status', ['pending', 'confirmed']);

      const blockedIds = new Set((blocked || []).map((a: { opening_id: string }) => a.opening_id));
      const safeIds = Array.from(selectedOpeningIds).filter(id => !blockedIds.has(id));
      const blockedOpeningsList = openings.filter(o => blockedIds.has(o.id));

      if (blockedIds.size > 0) {
        setBlockedOpenings(blockedOpeningsList);
        setSafeIdsToDelete(safeIds);
        setShowBulkDeleteConfirm(true);
        setIsBulkDeleting(false);
        return;
      }

      await deleteSafeOpenings(safeIds);
    } catch (err) {
      toast.error('Failed to check appointments');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`);
      options.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return options;
  };

  const generateEndTimeOptions = () => {
    if (!newOpening.startTime) return generateTimeOptions();
    
    const allTimes = generateTimeOptions();
    const startMinutes = parseTime(newOpening.startTime);
    
    return allTimes.filter(time => {
      const timeMinutes = parseTime(time);
      return timeMinutes > startMinutes;
    });
  };

  const generateDurationOptions = () => {
    const options = [];
    for (let i = 1; i <= 24; i++) {
      options.push({ value: i, label: `${i} hour${i > 1 ? 's' : ''}` });
    }
    return options;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Opening</h2>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setCurrentDate(new Date())} 
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>Today</span>
          </Button>
          <Button 
            onClick={() => setShowAddOpening(true)} 
            className="flex items-center space-x-2"
            disabled={!user}
          >
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
        {/* Calendar Grid */}
        <Card className="lg:col-span-2 shadow-soft border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                  <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></span>
                </div>
              )}
              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth(currentDate).map((date, index) => {
                  const openingCount = date ? getOpeningsForDate(date).length : 0;
                  return (
                    <div
                      key={index}
                      className={`p-2 h-12 flex flex-col items-center justify-center text-sm cursor-pointer rounded-lg transition-colors relative ${
                        !date
                          ? ''
                          : isToday(date)
                          ? 'bg-calendar-today text-primary-foreground font-bold'
                          : isSameDate(date, selectedDate)
                          ? 'bg-primary-light text-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:bg-secondary'
                      }`}
                      onClick={() => { if (date) { setSelectedDate(date); setSelectedOpeningIds(new Set()); } }}
                    >
                      <span>{date?.getDate()}</span>
                      {/* Show indicator with count for dates with openings */}
                      {date && openingCount > 0 && (
                        <span
                          className="block text-xs rounded-full bg-primary text-primary-foreground px-1 mt-1 mx-auto min-w-[1.5em] text-center"
                          title={`${openingCount} opening${openingCount > 1 ? 's' : ''}`}
                        >
                          {openingCount}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card className="shadow-soft border-card-border">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-lg font-semibold">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </CardTitle>
              {getOpeningsForDate(selectedDate).length > 0 && user && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={selectedOpeningIds.size === 0 || isBulkDeleting}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedOpeningIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const openingsForDate = getOpeningsForDate(selectedDate);
                
                // Group by worker
                const groupedByWorker = openingsForDate.reduce((acc, opening) => {
                  if (!acc[opening.worker]) {
                    acc[opening.worker] = [];
                  }
                  acc[opening.worker].push(opening);
                  return acc;
                }, {} as { [key: string]: Opening[] });

                const workers = Object.keys(groupedByWorker).sort();

                if (workers.length === 0) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      No openings for this date
                    </div>
                  );
                }

                return workers.map((worker) => {
                  const isCollapsed = collapsedWorkers.has(worker);
                  const workerOpenings = groupedByWorker[worker];

                  return (
                    <div key={worker} className="border border-input rounded-lg overflow-hidden">
                      <button
                        onClick={() => {
                          const newCollapsed = new Set(collapsedWorkers);
                          if (isCollapsed) {
                            newCollapsed.delete(worker);
                          } else {
                            newCollapsed.add(worker);
                          }
                          setCollapsedWorkers(newCollapsed);
                        }}
                        className="w-full flex items-center justify-between p-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                          />
                          <span className="font-semibold text-foreground">{worker}</span>
                          <span className="text-xs text-muted-foreground">({workerOpenings.length})</span>
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="space-y-2 p-4 bg-card/50 border-t border-input">
                          {workerOpenings.map((opening) => (
                            <div
                              key={opening.id}
                              className="p-1 rounded-lg border border-input bg-card hover:bg-accent transition-all flex items-center justify-between gap-3 cursor-pointer" onClick={() => window.open(`/openings/${opening.id}`, "_blank")}
                            >
                              <div
                                className="flex-shrink-0 pl-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={selectedOpeningIds.has(opening.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedOpeningIds(prev => {
                                      const next = new Set(prev);
                                      if (checked) next.add(opening.id);
                                      else next.delete(opening.id);
                                      return next;
                                    });
                                  }}
                                />
                              </div>
                              <div className="text-sm space-y-1 flex-1">
                                <div className="font-medium whitespace-nowrap overflow-hidden">{new Date(`1970-01-01T${opening.start_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(`1970-01-01T${opening.end_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} ({opening.duration}h)</div>
                                <div className="font-medium">{opening.service}</div>
                                <div>
                                  {Number(opening.hourly_rate) === 0
                                    ? 'Free'
                                    : `$${Number(opening.hourly_rate) * Number(opening.duration)}`}
                                </div>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); removeOpening(opening.id); }}
                                    disabled={!user}
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove opening</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); if (opening.is_available) openEditDialog(opening); }}
                                    disabled={!user || !opening.is_available}
                                    variant="ghost"
                                    size="sm"
                                    className="flex-shrink-0"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {opening.is_available ? 'Edit opening' : 'Editing booked openings is not allowed'}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddOpening} onOpenChange={setShowAddOpening}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Opening for {selectedDate.toLocaleDateString()}</DialogTitle>
          </DialogHeader>
          {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={newOpening.multipleSlots} 
                onCheckedChange={(checked) => {
                  setNewOpening({...newOpening, multipleSlots: checked});
                  setErrors(prev => ({ ...prev, endTime: '' }));
                }}
              />
              <Label>Create multiple time slots</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                checked={newOpening.multipleDates} 
                onCheckedChange={(checked) => {
                  setNewOpening({...newOpening, multipleDates: checked});
                }}
              />
              <Label>Create multiple date slots</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Select 
                value={newOpening.startTime} 
                onValueChange={(value) => {
                  setNewOpening({...newOpening, startTime: value});
                  setErrors(prev => ({ ...prev, startTime: '' }));
                }}
              >
                <SelectTrigger className={errors.startTime ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.startTime && <p className="text-sm text-destructive">{errors.startTime}</p>}
            </div>

            {newOpening.multipleSlots && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Select 
                    value={newOpening.endTime} 
                    onValueChange={(value) => {
                      setNewOpening({...newOpening, endTime: value});
                      setErrors(prev => ({ ...prev, endTime: '' }));
                    }}
                  >
                    <SelectTrigger className={errors.endTime ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateEndTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.endTime && <p className="text-sm text-destructive">{errors.endTime}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Interval (hours)</Label>
                  <Select 
                    value={newOpening.interval.toString()} 
                    onValueChange={(value) => {
                      setNewOpening({...newOpening, interval: parseInt(value)});
                      setErrors(prev => ({ ...prev, interval: '' }));
                    }}
                  >
                    <SelectTrigger className={errors.interval ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateDurationOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.interval && <p className="text-sm text-destructive">{errors.interval}</p>}
                </div>
              </>
            )}
            
            {!newOpening.multipleSlots && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select 
                  value={newOpening.duration.toString()} 
                  onValueChange={(value) => {
                    setNewOpening({...newOpening, duration: parseInt(value)});
                    setErrors(prev => ({ ...prev, duration: '' }));
                  }}
                >
                  <SelectTrigger className={errors.duration ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateDurationOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.duration && <p className="text-sm text-destructive">{errors.duration}</p>}
              </div>
            )}

            {newOpening.multipleDates && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dateRangeStart">Start Date</Label>
                  <Input
                    type="date"
                    value={newOpening.dateRangeStart}
                    onChange={(e) => {
                      setNewOpening({...newOpening, dateRangeStart: e.target.value});
                      setErrors(prev => ({ ...prev, dateRangeStart: '' }));
                    }}
                  />
                  {errors.dateRangeStart && <p className="text-sm text-destructive">{errors.dateRangeStart}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateRangeEnd">End Date</Label>
                  <Input
                    type="date"
                    value={newOpening.dateRangeEnd}
                    onChange={(e) => {
                      setNewOpening({...newOpening, dateRangeEnd: e.target.value});
                      setErrors(prev => ({ ...prev, dateRangeEnd: '' }));
                    }}
                  />
                  {errors.dateRangeEnd && <p className="text-sm text-destructive">{errors.dateRangeEnd}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const newWeekdays = new Set(newOpening.weekdays);
                          if (newWeekdays.has(index)) {
                            newWeekdays.delete(index);
                          } else {
                            newWeekdays.add(index);
                          }
                          setNewOpening({...newOpening, weekdays: newWeekdays});
                        }}
                        className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                          newOpening.weekdays.has(index)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-accent'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {isOrgMode ? (
              <div className="space-y-2">
                <Label htmlFor="worker">Worker</Label>
                <Select 
                  value={newOpening.worker} 
                  onValueChange={(value) => {
                    const skills = getWorkerSkills(value);
                    setNewOpening({...newOpening, worker: value, service: skills[0] || ''});
                    setErrors(prev => ({ ...prev, worker: '', service: '' }));
                  }}
                >
                  <SelectTrigger className={errors.worker ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {acceptedWorkers.map((w) => (
                      <SelectItem key={w.id} value={w.worker_name}>{w.worker_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.worker && <p className="text-sm text-destructive">{errors.worker}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Worker</Label>
                <Input value={selfWorkerName} disabled className="bg-muted" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Select 
                value={newOpening.service} 
                onValueChange={(value) => {
                  setNewOpening({...newOpening, service: value});
                  setErrors(prev => ({ ...prev, service: '' }));
                }}
              >
                <SelectTrigger className={errors.service ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {getWorkerSkills(isOrgMode ? newOpening.worker : selfWorkerName).map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.service && <p className="text-sm text-destructive">{errors.service}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              {savedAddresses.length > 0 && (
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value !== '__custom__') {
                      try {
                        const addr = JSON.parse(value);
                        setNewOpening({
                          ...newOpening,
                          locationFields: {
                            city: addr.city || '',
                            province: addr.province || '',
                            country: addr.country || '',
                            zip: addr.zip || ''
                          }
                        });
                      } catch {}
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Use saved address" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedAddresses.map((addr: any) => (
                      <SelectItem key={addr.id} value={addr.address}>
                        {addr.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom location...</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <AddressInput 
                value={newOpening.locationFields}
                onChange={(fields) => setNewOpening({ ...newOpening, locationFields: fields })}
                required
              />
              {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
            </div>

            {/* Rate Selector */}
            <div className="space-y-2">
              <Label>Rate</Label>
              <Select
                value={newOpening.isFree ? 'free' : 'paid'}
                onValueChange={(value) => setNewOpening({...newOpening, isFree: value === 'free'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free ($0/hr)</SelectItem>
                  <SelectItem value="paid">${Number(getWorkerRate(isOrgMode ? newOpening.worker : selfWorkerName))}/hr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(isOrgMode ? newOpening.worker : true) && (
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Rate Preview</div>
                <div className="font-medium">
                  {newOpening.isFree ? 'Free ($0/hr)' : `$${Number(getWorkerRate(isOrgMode ? newOpening.worker : selfWorkerName))}/hr`}
                </div>
                {!newOpening.isFree && (
                  newOpening.multipleSlots ? (
                    <div className="text-sm">Each slot: ${Number(getWorkerRate(isOrgMode ? newOpening.worker : selfWorkerName)) * Number(newOpening.interval)}</div>
                  ) : (
                    <div className="text-sm">Total: ${Number(getWorkerRate(isOrgMode ? newOpening.worker : selfWorkerName)) * Number(newOpening.duration)}</div>
                  )
                )}
              </div>
            )}

            {/* Accepted Payment Methods */}
            <div className="space-y-2">
              <Label>Accepted Payment Methods</Label>
              <p className="text-xs text-muted-foreground">Customer will choose from these methods when paying</p>
              {providerPaymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No payment methods configured. Set them up in Settings.</p>
              ) : (
                <div className="space-y-2">
                  {providerPaymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pm-new-${pm.id}`}
                        checked={newOpening.acceptedPaymentMethodIds.includes(pm.id)}
                        onCheckedChange={(checked) => {
                          setNewOpening(prev => ({
                            ...prev,
                            acceptedPaymentMethodIds: checked
                              ? [...prev.acceptedPaymentMethodIds, pm.id]
                              : prev.acceptedPaymentMethodIds.filter(id => id !== pm.id),
                          }));
                        }}
                      />
                      <label htmlFor={`pm-new-${pm.id}`} className="text-sm cursor-pointer">
                        {pm.label} <span className="text-muted-foreground">({pm.type})</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddOpening(false)}>
                Cancel
              </Button>
              <Button onClick={addOpening} disabled={loading || !user}>
                {loading ? 'Adding...' : 'Add Opening'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showBulkDeleteConfirm} onOpenChange={(open) => {
        if (!open) { setShowBulkDeleteConfirm(false); setBlockedOpenings([]); setSafeIdsToDelete([]); }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Openings with Active Appointments</DialogTitle>
            <DialogDescription>
              Some selected openings have pending or confirmed appointments. Please modify or reach out to customers for the following openings before deleting:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {blockedOpenings.map(o => (
              <div key={o.id} className="text-sm p-2 rounded bg-destructive/10 border border-destructive/20">
                <span className="font-medium">{o.date}</span>
                {' · '}
                {new Date(`1970-01-01T${o.start_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                {' – '}
                {new Date(`1970-01-01T${o.end_time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                {' · '}
                {o.worker}
                {' · '}
                {o.service}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Please modify these openings or reach out to your customers before deleting.
          </p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setShowBulkDeleteConfirm(false); setBlockedOpenings([]); setSafeIdsToDelete([]); }}
            >
              Go Back
            </Button>
            {safeIdsToDelete.length > 0 && (
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteSafeOpenings(safeIdsToDelete);
                  } catch {
                    toast.error('Failed to delete openings');
                  }
                  setShowBulkDeleteConfirm(false);
                  setBlockedOpenings([]);
                  setSafeIdsToDelete([]);
                }}
              >
                Delete Safe Ones ({safeIdsToDelete.length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Opening Dialog */}
      <Dialog open={!!editingOpening} onOpenChange={(open) => { if (!open) setEditingOpening(null); }}>
        <DialogContent key={editingOpening?.id} className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Opening</DialogTitle>
            {editingOpening && (
              <DialogDescription>
                {editingOpening.date} · {editingOpening.start_time} – {editingOpening.end_time}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Service */}
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={editForm.service}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, service: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {getWorkerSkills(isOrgMode ? (editingOpening?.worker ?? '') : selfWorkerName).map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select
                value={editForm.startTime}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, startTime: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label>End Time</Label>
              <Select
                value={editForm.endTime}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, endTime: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end time" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rate */}
            <div className="space-y-2">
              <Label>Rate</Label>
              <Select
                value={editForm.isFree ? 'free' : 'paid'}
                onValueChange={(v) => setEditForm(prev => ({ ...prev, isFree: v === 'free' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free ($0/hr)</SelectItem>
                  <SelectItem value="paid">${Number(getWorkerRate(isOrgMode ? (editingOpening?.worker ?? '') : selfWorkerName))}/hr</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Accepted Payment Methods */}
            <div className="space-y-2">
              <Label>Accepted Payment Methods</Label>
              <p className="text-xs text-muted-foreground">Customer will choose from these methods when paying</p>
              {providerPaymentMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No payment methods configured. Set them up in Settings.</p>
              ) : (
                <div className="space-y-2">
                  {providerPaymentMethods.map((pm) => (
                    <div key={pm.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`pm-edit-${pm.id}`}
                        checked={editForm.acceptedPaymentMethodIds.includes(pm.id)}
                        onCheckedChange={(checked) => {
                          setEditForm(prev => ({
                            ...prev,
                            acceptedPaymentMethodIds: checked
                              ? [...prev.acceptedPaymentMethodIds, pm.id]
                              : prev.acceptedPaymentMethodIds.filter(id => id !== pm.id),
                          }));
                        }}
                      />
                      <label htmlFor={`pm-edit-${pm.id}`} className="text-sm cursor-pointer">
                        {pm.label} <span className="text-muted-foreground">({pm.type})</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setEditingOpening(null)}>Cancel</Button>
              <Button onClick={saveEditOpening} disabled={isEditSaving}>
                {isEditSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}












