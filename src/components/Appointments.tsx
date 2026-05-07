import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Filter, Calendar, Clock, User, MapPin, Check, X, CheckCircle, ChevronDown, ChevronUp, Loader2, Mail, Phone, Users, ArrowRightLeft, CalendarPlus, BellRing, BellOff, Bell, CreditCard, Send, ImageIcon, FileImage } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { useOrgWorkers } from '@/hooks/useOrgWorkers';
import { toast } from 'sonner';
import { ModifyAppointmentDialog } from './ModifyAppointmentDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { parseLocation, formatLocation } from '@/lib/address';
import { deserializeDetailsByType } from '@/lib/payment/serialization';
import { PaymentDisplay } from '@/components/payment/PaymentDisplay';
import { PaymentMethodRecord } from '@/lib/payment/types';
import { getMethodLabel } from '@/lib/payment/methods';

interface Appointment {
  id: string;
  opening_id: string;
  user_id: string;
  provider_id: string;
  worker: string;
  service: string;
  location: string | null;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  notes: string | null;
  created_at: string;
  hourly_rate?: number | null;  // Saved at booking time after migration; null/undefined on old records
  approved_by?: string | null;
  booker_name?: string | null;
  booker_email?: string | null;
  booker_phone?: string | null;
  booker_slug?: string | null;
  provider_name?: string | null;
  provider_slug?: string | null;
  approved_by_name?: string | null;
}


// Calendar export helpers
const formatDateForCalendar = (date: string, time: string): Date => {
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
};

const toUTCString = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const toGoogleCalendarUrl = (appointment: Appointment): string => {
  const startDate = formatDateForCalendar(appointment.date, appointment.start_time);
  const endDate = formatDateForCalendar(appointment.date, appointment.end_time);
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${appointment.service} with ${appointment.worker}`,
    dates: `${toUTCString(startDate)}/${toUTCString(endDate)}`,
    details: appointment.notes || `Appointment for ${appointment.service}`,
    location: appointment.location || '',
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const toOutlookUrl = (appointment: Appointment): string => {
  const startDate = formatDateForCalendar(appointment.date, appointment.start_time);
  const endDate = formatDateForCalendar(appointment.date, appointment.end_time);
  
  const params = new URLSearchParams({
    subject: `${appointment.service} with ${appointment.worker}`,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: appointment.notes || `Appointment for ${appointment.service}`,
    location: appointment.location || '',
    path: '/calendar/action/compose',
    rru: 'addevent',
  });
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

const toICSContent = (appointments: Appointment[]): string => {
  const events = appointments.map(appointment => {
    const startDate = formatDateForCalendar(appointment.date, appointment.start_time);
    const endDate = formatDateForCalendar(appointment.date, appointment.end_time);
    
    return `BEGIN:VEVENT
DTSTART:${toUTCString(startDate)}
DTEND:${toUTCString(endDate)}
SUMMARY:${appointment.service} with ${appointment.worker}
DESCRIPTION:${appointment.notes || `Appointment for ${appointment.service}`}
LOCATION:${appointment.location || ''}
END:VEVENT`;
  }).join('\n');
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PikAppoint//EN
${events}
END:VCALENDAR`;
};

const downloadICS = (appointments: Appointment[]) => {
  const content = toICSContent(appointments);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = appointments.length === 1 
    ? `appointment-${appointments[0].id}.ics` 
    : `appointments-${appointments.length}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

function getWeekStartSunday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0=Sun
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function formatWeekLabel(weekStart: string): string {
  const [wy, wm, wd] = weekStart.split('-').map(Number);
  return new Date(wy, wm - 1, wd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function applyDateFilter(apts: Appointment[], filter: DateFilter): Appointment[] {
  if (filter === 'all') return apts;
  const now = new Date();
  return apts.filter(apt => {
    const [y, m, d] = apt.date.split('-').map(Number);
    const aptDate = new Date(y, m - 1, d);
    if (filter === 'today') {
      return aptDate.toDateString() === now.toDateString();
    }
    if (filter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return aptDate >= startOfWeek && aptDate <= endOfWeek;
    }
    if (filter === 'month') {
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
    }
    return true;
  });
}

export function Appointments() {
  const { workers, acceptedWorkers, getWorkerRate } = useOrgWorkers();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isOrganization, isInternalDev } = useUserRoles();
  const queryClient = useQueryClient();
  
  // Notification polling hook
  const { permissionStatus, requestPermission } = useAppointmentNotifications({
    userId: user?.id,
    enabled: !isOrganization && !isInternalDev, // Only for regular users, not org view
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActing, setIsBulkActing] = useState(false);
  const [bulkModifyQueue, setBulkModifyQueue] = useState<Appointment[]>([]);
  const [bulkModifyIndex, setBulkModifyIndex] = useState(0);
  const [showBulkModifyDialog, setShowBulkModifyDialog] = useState(false);
  const [bulkModifyAvailableOpenings, setBulkModifyAvailableOpenings] = useState<any[]>([]);
  const [bulkModifyLoadingOpenings, setBulkModifyLoadingOpenings] = useState(false);
  const [bulkModifyModifying, setBulkModifyModifying] = useState<string | null>(null);
  const [paymentInfoProviderId, setPaymentInfoProviderId] = useState<string | null>(null);
  const [paymentInfoProviderName, setPaymentInfoProviderName] = useState<string>('');
  const [paymentInfoOpeningId, setPaymentInfoOpeningId] = useState<string | null>(null);
  const [paymentProofNote, setPaymentProofNote] = useState('');
  const [paymentProofPhoto, setPaymentProofPhoto] = useState<string | null>(null);
  const [paymentProofPhotoName, setPaymentProofPhotoName] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [paymentProofAppointmentId, setPaymentProofAppointmentId] = useState<string | null>(null);
  const [providerViewProofAppointmentId, setProviderViewProofAppointmentId] = useState<string | null>(null);
  const [proofImageError, setProofImageError] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const modeParam= searchParams.get('mode');
  const isOrgView = modeParam === 'org' && (isOrganization || isInternalDev);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', user?.id, isOrgView, acceptedWorkers],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('appointments')
        .select('*');

      if (isOrgView) {
        // Org view: show appointments where provider is the org (provider_id = org owner)
        // All org openings/appointments have provider_id = org owner's ID
        query = query.eq('provider_id', user.id);
      } else {
        // User view: show appointments where user is either:
        // 1. The booker/customer (user_id = user.id), OR
        // 2. The provider who needs to approve/manage (provider_id = user.id)
        query = query.or(`user_id.eq.${user.id},provider_id.eq.${user.id}`);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      const providerIds = [...new Set((data || []).map((a: any) => a.provider_id))];
      const bookerIds = [...new Set((data || []).map((a: any) => a.user_id))];
      const approverIds = [...new Set((data || []).map((a: any) => a.approved_by).filter(Boolean))];
      const allIds = [...new Set([...providerIds, ...bookerIds, ...approverIds])];
      
      let profileMap = new Map<string, { full_name: string; slug: string | null }>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_public_profile_names', { profile_ids: allIds });
        profileMap = new Map((profiles || []).map((p: any) => [p.id, { full_name: p.full_name, slug: p.slug }]));
      }

      let bookerContactMap = new Map<string, { email: string | null; phone: string | null }>();
      if (bookerIds.length > 0) {
        const contactResults = await Promise.all(
          bookerIds.map((id) => supabase.rpc('get_public_profile_by_id', { profile_id: id }))
        );
        contactResults.forEach((res, idx) => {
          const p = (res.data && (res.data as any)[0]) || null;
          bookerContactMap.set(bookerIds[idx], { email: p?.email ?? null, phone: p?.phone ?? null });
        });
      }

      return (data || []).map((a: any) => ({
        ...a,
        provider_slug: profileMap.get(a.provider_id)?.slug || null,
        booker_name: profileMap.get(a.user_id)?.full_name || null,
        booker_slug: profileMap.get(a.user_id)?.slug || null,
        booker_email: bookerContactMap.get(a.user_id)?.email || null,
        booker_phone: bookerContactMap.get(a.user_id)?.phone || null,
        approved_by_name: profileMap.get(a.approved_by)?.full_name || null,
      })) as Appointment[];
    },
    enabled: !!user,
  });

  const appointmentIds = useMemo(() => appointments.map(a => a.id), [appointments]);

  const { data: submittedProofs } = useQuery({
    queryKey: ['payment-proofs-bulk', appointmentIds],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('payment_proofs')
        .select('appointment_id, photo')
        .in('appointment_id', appointmentIds);
      return data ?? [];
    },
  });

  const paidAppointmentIds = useMemo(
    () => new Map(
      (submittedProofs ?? []).map((p: { appointment_id: string; photo: string | null }) => [p.appointment_id, p.photo ?? null])
    ),
    [submittedProofs]
  );

  const { data: appointmentRates = [] } = useQuery({
    queryKey: ['appointment-rates', appointmentIds],
    enabled: appointmentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_appointment_rates', { _appointment_ids: appointmentIds });
      if (error) throw error;
      return (data ?? []) as { appointment_id: string; hourly_rate: number }[];
    },
  });

  const appointmentRateMap = useMemo(
    () => new Map(appointmentRates.map(r => [r.appointment_id, Number(r.hourly_rate ?? 0)])),
    [appointmentRates]
  );

  const { data: providerPayments = [], isFetching: loadingProviderPayments } = useQuery({
    queryKey: ['provider-payment-methods', paymentInfoProviderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', paymentInfoProviderId!)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentMethodRecord[];
    },
    enabled: !!paymentInfoProviderId,
  });

  // Fetch org payment methods if the provider belongs to an org
  const { data: orgPayments = [], isFetching: loadingOrgPayments } = useQuery({
    queryKey: ['org-payment-methods', paymentInfoProviderId],
    queryFn: async () => {
      const { data: orgId } = await supabase.rpc('get_worker_org_id', {
        _user_id: paymentInfoProviderId!,
      });
      if (!orgId) return [] as PaymentMethodRecord[];
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', orgId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentMethodRecord[];
    },
    enabled: !!paymentInfoProviderId,
  });

  // Fetch the opening's accepted payment method IDs to filter what customer sees
  const { data: paymentInfoOpening, isLoading: loadingPaymentInfoOpening } = useQuery({
    queryKey: ['opening-payment-methods', paymentInfoOpeningId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('accepted_payment_method_ids')
        .eq('id', paymentInfoOpeningId!)
        .maybeSingle();
      if (error) throw error;
      return data as { accepted_payment_method_ids: string[] | null } | null;
    },
    enabled: !!paymentInfoOpeningId,
  });

  // Deduplicated + filtered methods based on opening's accepted IDs
  const allAvailableMethods = useMemo(() => {
    const all = [...(providerPayments ?? []), ...(orgPayments ?? [])];
    const seen = new Set<string>();
    const deduped = all.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    const acceptedIds = paymentInfoOpening?.accepted_payment_method_ids;
    if (!acceptedIds || acceptedIds.length === 0) return deduped;
    return deduped.filter(m => acceptedIds.includes(m.id));
  }, [providerPayments, orgPayments, paymentInfoOpening]);

  const { data: existingPaymentProof, isFetching: loadingExistingProof } = useQuery({    queryKey: ['payment-proof', paymentProofAppointmentId],
    enabled: !!paymentProofAppointmentId,
    queryFn: async () => {
      if (!paymentProofAppointmentId) return null;
      const { data } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('appointment_id', paymentProofAppointmentId)
        .maybeSingle();
      return data ?? null;
    },
  });

  const { data: providerViewProof, isFetching: loadingProviderProof } = useQuery({
    queryKey: ['payment-proof', providerViewProofAppointmentId],
    enabled: !!providerViewProofAppointmentId,
    queryFn: async () => {
      if (!providerViewProofAppointmentId) return null;
      const { data } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('appointment_id', providerViewProofAppointmentId)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Pre-fill form when existing proof loaded (and user hasn't just submitted)
  useEffect(() => {
    if (existingPaymentProof && paymentProofAppointmentId) {
      setPaymentProofNote(existingPaymentProof.note ?? '');
      setPaymentProofPhoto(existingPaymentProof.photo ?? null);
      setProofSubmitted(true);
    }
  }, [existingPaymentProof, paymentProofAppointmentId]);

  // Clear form when dialog closes
  useEffect(() => {
    if (!paymentProofAppointmentId) {
      setPaymentProofNote('');
      setPaymentProofPhoto(null);
      setPaymentProofPhotoName('');
      setProofSubmitted(false);
    }
  }, [paymentProofAppointmentId]);

  const handlePaymentPhotoUpload= (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Photo must be under 20MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        // Start at quality 0.85, reduce until under 1MB
        let quality = 0.85;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 1 * 1024 * 1024 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        setPaymentProofPhoto(dataUrl);
        setPaymentProofPhotoName(file.name);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPaymentProof = async () => {
    if (!paymentProofAppointmentId) return;
    setIsSubmittingProof(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('payment_proofs')
        .upsert({
          appointment_id: paymentProofAppointmentId,
          customer_id: user.id,
          note: paymentProofNote || null,
          photo: paymentProofPhoto || null,
        }, { onConflict: 'appointment_id' });

      if (error) throw error;

      // Also notify provider via audit event (for their notification feed)
      await supabase.rpc('log_audit_event', {
        _event_type: 'payment.proof_submitted',
        _entity_id: paymentProofAppointmentId,
        _metadata: { note: paymentProofNote, customer_name: user.email },
      });

      queryClient.invalidateQueries({ queryKey: ['payment-proof', paymentProofAppointmentId] });
      queryClient.invalidateQueries({ queryKey: ['payment-proofs-bulk'] });
      setProofSubmitted(true);
    } catch (err: any) {
      console.error('Failed to submit payment proof:', err);
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const getStatusColor= (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getAppointmentTotal = (apt: Appointment): { isFree: boolean; total: number } => {
    let rate: number;
    // Priority 1: rate saved on appointment at booking time (after 20260507 migration)
    if (apt.hourly_rate != null && Number(apt.hourly_rate) > 0) {
      rate = Number(apt.hourly_rate);
    // Priority 2: org view uses org_workers rate
    } else if (isOrgView) {
      rate = getWorkerRate(apt.worker) || appointmentRateMap.get(apt.id) || 0;
    // Priority 3: server-side RPC lookup (works for customers - bypasses RLS)
    } else {
      rate = appointmentRateMap.get(apt.id) || 0;
    }
    const isFree = rate === 0;
    // duration stored in hours (e.g. 1.5 = 90 min); guard: if > 24 assume minutes
    const durationHours = apt.duration > 24 ? apt.duration / 60 : apt.duration;
    const total = isFree ? 0 : rate * durationHours;
    return { isFree, total };
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch =
      apt.worker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (apt.booker_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const matchesWorker = workerFilter === 'all' || apt.worker === workerFilter;

    return matchesSearch && matchesStatus && matchesWorker;
  });

  const today = new Date().toISOString().split('T')[0];
  const activeAppointments = filteredAppointments
    .filter(apt => (apt.status === 'confirmed' || apt.status === 'pending') && apt.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date)); // ascending — earliest first

  const inactiveAppointments = filteredAppointments
    .filter(apt => apt.status === 'completed' || apt.status === 'cancelled' || apt.date < today)
    .sort((a, b) => b.date.localeCompare(a.date)); // descending — latest first

  const handleApprove = async (appointmentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('approve_appointment', {
        _appointment_id: appointmentId,
        _provider_id: user.id,
      });
      if (error) throw error;
      toast.success('Appointment approved! Other pending requests were automatically declined.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleCancel = async (appointmentId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('cancel_appointment', {
        _appointment_id: appointmentId,
        _caller_id: user.id,
      });
      if (error) throw error;
      toast.success('Appointment cancelled.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel');
    }
  };

  const handleComplete = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);
    if (error) {
      toast.error('Failed to complete');
    } else {
      toast.success('Appointment completed.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
  };

  const handleBulkApprove = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toApprove = appointments.filter(a => selectedIds.has(a.id) && a.status === 'pending' && a.provider_id === user.id);
    let successCount = 0;
    for (const apt of toApprove) {
      try {
        const { error } = await supabase.rpc('approve_appointment', {
          _appointment_id: apt.id,
          _provider_id: user.id,
        });
        if (!error) successCount++;
      } catch {}
    }
    toast.success(`${successCount} appointment(s) approved.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    setIsBulkActing(false);
  };

  const handleBulkCancel = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toCancel = appointments.filter(a => selectedIds.has(a.id) && (a.status === 'pending' || a.status === 'confirmed'));
    let successCount = 0;
    for (const apt of toCancel) {
      try {
        const { error } = await supabase.rpc('cancel_appointment', {
          _appointment_id: apt.id,
          _caller_id: user.id,
        });
        if (!error) successCount++;
      } catch {}
    }
    toast.success(`${successCount} appointment(s) cancelled.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    setIsBulkActing(false);
  };

  const handleBulkComplete = async () => {
    if (!user) return;
    setIsBulkActing(true);
    const toComplete = appointments.filter(a =>
      selectedIds.has(a.id) &&
      a.status === 'confirmed' &&
      (isOrgView || a.provider_id === user.id)
    );
    let successCount = 0;
    for (const apt of toComplete) {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', apt.id);
        if (!error) successCount++;
      } catch {}
    }
    toast.success(`${successCount} appointment(s) completed.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    setIsBulkActing(false);
  };

  const loadBulkModifyOpenings = async (apt: Appointment) => {
    setBulkModifyLoadingOpenings(true);
    const { data } = await supabase
      .from('openings')
      .select('*')
      .eq('is_available', true)
      .eq('user_id', apt.provider_id)
      .eq('worker', apt.worker)
      .neq('id', apt.opening_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    setBulkModifyAvailableOpenings(data || []);
    setBulkModifyLoadingOpenings(false);
  };

  const advanceBulkModifyQueue = async () => {
    const nextIndex = bulkModifyIndex + 1;
    if (nextIndex >= bulkModifyQueue.length) {
      setShowBulkModifyDialog(false);
      setBulkModifyQueue([]);
      setBulkModifyIndex(0);
      setSelectedIds(new Set());
    } else {
      setBulkModifyIndex(nextIndex);
      await loadBulkModifyOpenings(bulkModifyQueue[nextIndex]);
    }
  };

  const handleStartBulkModify = async () => {
    if (!user) return;
    const toModify = appointments.filter(a =>
      selectedIds.has(a.id) &&
      (a.status === 'pending' || a.status === 'confirmed') &&
      (isOrgView || a.provider_id === user.id || a.user_id === user.id)
    );
    if (toModify.length === 0) return;
    setBulkModifyQueue(toModify);
    setBulkModifyIndex(0);
    setShowBulkModifyDialog(true);
    await loadBulkModifyOpenings(toModify[0]);
  };

  const handleBulkModifyOne = async (newOpeningId: string) => {
    const apt = bulkModifyQueue[bulkModifyIndex];
    if (!apt || !user) return;
    setBulkModifyModifying(newOpeningId);
    try {
      const { error } = await supabase.rpc('modify_appointment', {
        _appointment_id: apt.id,
        _new_opening_id: newOpeningId,
        _caller_id: user.id,
      });
      if (error) throw error;
      toast.success(`Appointment modified (${bulkModifyIndex + 1}/${bulkModifyQueue.length})`);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to modify');
    } finally {
      setBulkModifyModifying(null);
      advanceBulkModifyQueue();
    }
  };

  // Group pending appointments by opening_id for org view
  const groupedPendingByOpening = (() => {
    if (!isOrgView) return null;
    const pendingAppts = activeAppointments.filter(a => a.status === 'pending');
    const groups = new Map<string, Appointment[]>();
    for (const apt of pendingAppts) {
      const existing = groups.get(apt.opening_id) || [];
      existing.push(apt);
      groups.set(apt.opening_id, existing);
    }
    return groups;
  })();

  const nonPendingActive = isOrgView
    ? activeAppointments.filter(a => a.status !== 'pending')
    : activeAppointments;

  const filteredNonPendingActive = applyDateFilter(nonPendingActive, dateFilter);

  const filteredInactive = applyDateFilter(inactiveAppointments, dateFilter);

  const renderBookerInfo= (appointment: Appointment) => {
    const bookerSlug = appointment.booker_slug;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-muted-foreground" />
          {bookerSlug ? (
            <span
              className="text-sm font-medium text-primary hover:underline cursor-pointer"
              onClick={() => navigate(`/profile/${bookerSlug}`)}
            >
              {appointment.booker_name || 'Unknown'}
            </span>
          ) : (
            <span
              className="text-sm font-medium text-primary hover:underline cursor-pointer"
              onClick={() => navigate(`/profile/${appointment.user_id}`)}
            >
              {appointment.booker_name || 'Unknown'}
            </span>
          )}
        </div>
        {(appointment.booker_email || appointment.booker_phone) && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {appointment.booker_email && (
              <a href={`mailto:${appointment.booker_email}`} className="flex items-center space-x-1 hover:text-primary transition-colors">
                <Mail className="h-3 w-3" />
                <span>{appointment.booker_email}</span>
              </a>
            )}
            {appointment.booker_phone && (
              <a href={`tel:${appointment.booker_phone}`} className="flex items-center space-x-1 hover:text-primary transition-colors">
                <Phone className="h-3 w-3" />
                <span>{appointment.booker_phone}</span>
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderGroupedPendingCard = (openingId: string, appts: Appointment[]) => {
    const first = appts[0];
    const isProvider = first.provider_id === user?.id;
    // In org mode, allow approval if user is the provider OR is an org admin viewing their own
    const canApprove = isProvider;
    
    return (
      <Card key={`group-${openingId}`} className="shadow-soft border-card-border hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400">
        <CardContent className="p-6 space-y-4">
          {/* Opening info header */}
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
                  <span>{new Date(first.date).toLocaleDateString()}</span>
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

          {/* List of pending bookers */}
          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              {isProvider ? 'Choose one to approve:' : `Pending requests for ${first.worker}`}
            </p>
            {appts.map((apt) => {
              const aptIsProvider = apt.provider_id === user?.id;
              return (
                <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.has(apt.id)}
                      onCheckedChange={(checked) => {
                        setSelectedIds(prev => {
                          const next = new Set(prev);
                          checked ? next.add(apt.id) : next.delete(apt.id);
                          return next;
                        });
                      }}
                    />
                    {renderBookerInfo(apt)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const { isFree, total } = getAppointmentTotal(apt);
                      return (
                        <span className="text-sm font-medium text-muted-foreground">
                          {isFree ? 'Free' : `$${total % 1 === 0 ? total : total.toFixed(2)}`}
                        </span>
                      );
                    })()}
                    {(() => {
                      if (paidAppointmentIds.has(apt.id)) {
                        // Provider sees "Paid" button to view proof; customer sees nothing (they submitted it)
                        if (!aptIsProvider) return null;
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[44px] min-w-[44px] px-3 text-xs border-green-500 text-green-600 hover:bg-green-50 gap-1.5"
                            onClick={() => setProviderViewProofAppointmentId(apt.id)}
                            aria-label={`View payment proof for ${apt.booker_name || 'this appointment'}`}
                          >
                            <FileImage className="w-4 h-4" aria-hidden="true" />
                            Paid
                          </Button>
                        );
                      }
                      // "Payment Required" is for customers only — providers don't pay
                      if (aptIsProvider) return null;
                      const { isFree } = getAppointmentTotal(apt);
                      if (isFree) return null;
                      return (
                        <Badge variant="outline" className="text-red-600 border-red-600 dark:text-red-400 dark:border-red-400 text-xs">
                          Payment Required
                        </Badge>
                      );
                    })()}
                    {aptIsProvider ? (
                      <>
                        <Button variant="default" size="sm" onClick={() => handleApprove(apt.id)}>
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCancel(apt.id)}>
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleCancel(apt.id)}>
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
  };

  const renderAppointmentCard = (appointment: Appointment, isInactive = false) => {
    const canManage = isOrgView || appointment.provider_id === user?.id;
    
    return (
      <Card key={appointment.id} className="shadow-soft border-card-border hover:shadow-lg transition-shadow">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              {!isInactive && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(appointment.id)}
                    onCheckedChange={(checked) => {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        checked ? next.add(appointment.id) : next.delete(appointment.id);
                        return next;
                      });
                    }}
                  />
                </div>
              )}
              <div
                className={`w-12 h-12 bg-primary rounded-full flex items-center justify-center ${appointment.provider_slug ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}`}
                onClick={() => appointment.provider_slug && navigate(`/profile/${appointment.provider_slug}`)}
              >
                <span className="text-primary-foreground font-semibold">
                  {appointment.worker.substring(0, 2).toUpperCase()}
                </span>
              </div>
              <div
                className={appointment.provider_slug ? 'cursor-pointer' : ''}
                onClick={() => appointment.provider_slug && navigate(`/profile/${appointment.provider_slug}`)}
              >
                <h3 className={`font-semibold text-foreground ${appointment.provider_slug ? 'hover:underline' : ''}`}>{appointment.worker}</h3>
                <p className="text-sm text-muted-foreground">{appointment.service}</p>
              </div>
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
                {/* Total display */}
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
                        className="min-h-[44px] min-w-[44px] px-3 text-xs border-green-500 text-green-600 hover:bg-green-50 gap-1.5"
                        onClick={() => setProviderViewProofAppointmentId(appointment.id)}
                        aria-label={`View payment proof for ${appointment.booker_name || 'this appointment'}`}
                      >
                        <FileImage className="w-4 h-4" aria-hidden="true" />
                        Paid
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
                    <Button variant="ghost" size="sm" aria-label="Add to calendar">
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
                {appointment.user_id === user?.id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPaymentInfoProviderId(appointment.provider_id);
                          setPaymentInfoProviderName(appointment.worker);
                          setPaymentInfoOpeningId(appointment.opening_id);
                          setPaymentProofAppointmentId(appointment.id);
                          setProofSubmitted(false);
                        }}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>How to Pay</TooltipContent>
                  </Tooltip>
                )}
                {canManage && appointment.user_id !== user?.id && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProviderViewProofAppointmentId(appointment.id)}
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Payment Proof</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* Customer info for provider */}
          {canManage && appointment.booker_name && (
            <div className="border-t border-border pt-3">
              {renderBookerInfo(appointment)}
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
  };

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
        {!isOrgView && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center gap-2"
                  tabIndex={0}
                  role="img"
                  aria-label={
                    permissionStatus === 'granted' ? 'Notifications enabled' :
                    permissionStatus === 'denied' ? 'Notifications blocked — enable in browser settings' :
                    'Waiting for notification permission response'
                  }
                >
                  {permissionStatus === 'granted' && (
                    <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                  )}
                  {permissionStatus === 'denied' && (
                    <BellOff className="h-5 w-5 text-gray-400 dark:text-gray-600" aria-hidden="true" />
                  )}
                  {permissionStatus === 'default' && (
                    <Bell className="h-5 w-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {permissionStatus === 'granted' && 'Notifications enabled'}
                {permissionStatus === 'denied' && 'Notifications blocked — enable in browser settings'}
                {permissionStatus === 'default' && 'Waiting for notification permission response'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search appointments..."
                aria-label="Search appointments"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedIds(new Set()); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setSelectedIds(new Set()); }}>
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {isOrgView && (
              <Select value={workerFilter} onValueChange={(v) => { setWorkerFilter(v); setSelectedIds(new Set()); }}>
                <SelectTrigger className="w-full sm:w-48">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <SelectValue placeholder="Filter by worker" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workers</SelectItem>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.worker_name}>{w.worker_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div role="group" aria-label="Date filter" className="flex flex-wrap gap-2 mt-3">
            {(['all', 'today', 'week', 'month'] as DateFilter[]).map(f => (
              <Button
                key={f}
                variant={dateFilter === f ? 'default' : 'outline'}
                size="sm"
                aria-pressed={dateFilter === f}
                onClick={() => setDateFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Active */}
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

            {selectedIds.size > 0 && (
              <div className="sticky top-4 z-10 bg-card border border-border rounded-lg shadow-lg p-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
                <div className="flex flex-wrap gap-2 ml-auto">
                  {(() => {
                    const selectedAppts = [...appointments].filter(a => selectedIds.has(a.id));
                    const hasPending = selectedAppts.some(a => a.status === 'pending');
                    const isProviderOfAny = selectedAppts.some(a => a.provider_id === user?.id);
                    const hasConfirmed = selectedAppts.some(a => a.status === 'confirmed');
                    const canManageAny = selectedAppts.some(a => isOrgView || a.provider_id === user?.id);
                    const canModifyAny = selectedAppts.some(a => isOrgView || a.provider_id === user?.id || a.user_id === user?.id);
                    return (
                      <>
                        {hasPending && isProviderOfAny && (
                          <Button size="sm" variant="default" disabled={isBulkActing} onClick={handleBulkApprove}>
                            <Check className="h-3 w-3 mr-1" /> Approve ({selectedAppts.filter(a => a.status === 'pending' && a.provider_id === user?.id).length})
                          </Button>
                        )}
                        {hasConfirmed && canManageAny && (
                          <Button size="sm" variant="default" disabled={isBulkActing} onClick={handleBulkComplete}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Complete ({selectedAppts.filter(a => a.status === 'confirmed' && (isOrgView || a.provider_id === user?.id)).length})
                          </Button>
                        )}
                        {canModifyAny && (hasPending || hasConfirmed) && (
                          <Button size="sm" variant="outline" disabled={isBulkActing} onClick={handleStartBulkModify}>
                            <ArrowRightLeft className="h-3 w-3 mr-1" /> Modify ({selectedAppts.filter(a => (a.status === 'pending' || a.status === 'confirmed') && (isOrgView || a.provider_id === user?.id || a.user_id === user?.id)).length})
                          </Button>
                        )}
                        {(hasPending || hasConfirmed) && (
                          (() => {
                            const cancelCount = selectedAppts.filter(a => a.status === 'pending' || a.status === 'confirmed').length;
                            const allPending = selectedAppts.every(a => a.status === 'pending');
                            const label = allPending ? 'Reject' : 'Cancel';
                            return (
                              <Button size="sm" variant="outline" disabled={isBulkActing} onClick={handleBulkCancel}>
                                <X className="h-3 w-3 mr-1" /> {label} ({cancelCount})
                              </Button>
                            );
                          })()
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            const selectedAppts = appointments.filter(a => selectedIds.has(a.id));
                            downloadICS(selectedAppts);
                          }}
                        >
                          <CalendarPlus className="h-3 w-3 mr-1" /> Add to Calendar ({selectedAppts.length})
                        </Button>
                      </>
                    );
                  })()}
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Grouped pending requests (org view only) */}
            {isOrgView && groupedPendingByOpening && Array.from(groupedPendingByOpening.entries()).map(([openingId, appts]) =>
              renderGroupedPendingCard(openingId, appts)
            )}

            {/* Non-pendingor user-view appointments */}
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
                        {renderAppointmentCard(apt)}
                      </React.Fragment>
                    );
                  });
                })()}
              </div>
            ) : (
              dateFilter !== 'all' ? (
                <p className="text-muted-foreground text-sm">No appointments for this period.</p>
              ) : !isOrgView || !groupedPendingByOpening || groupedPendingByOpening.size === 0 ? (
                <Card className="shadow-soft border-card-border">
                  <CardContent className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg text-muted-foreground">No active appointments</p>
                  </CardContent>
                </Card>
              ) : null
            )}
          </div>

          {/* Inactive */}
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
                <div className="space-y-4">{filteredInactive.map(a => renderAppointmentCard(a, true))}</div>
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
        </>
      )}

      {/* Bulk Modify Dialog */}
      {showBulkModifyDialog && bulkModifyQueue[bulkModifyIndex] && (
        <Dialog open={showBulkModifyDialog} onOpenChange={(open) => {
          if (!open) {
            setShowBulkModifyDialog(false);
            setBulkModifyQueue([]);
            setBulkModifyIndex(0);
          }
        }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Modify Appointment {bulkModifyIndex + 1} of {bulkModifyQueue.length} — {bulkModifyQueue[bulkModifyIndex].worker}
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground mb-3">
              <p>Current: {new Date(bulkModifyQueue[bulkModifyIndex].date).toLocaleDateString()} {bulkModifyQueue[bulkModifyIndex].start_time}–{bulkModifyQueue[bulkModifyIndex].end_time}</p>
              {bulkModifyQueue[bulkModifyIndex].booker_name && <p>Customer: {bulkModifyQueue[bulkModifyIndex].booker_name}</p>}
            </div>
            <Button variant="ghost" size="sm" className="mb-3 text-muted-foreground" onClick={advanceBulkModifyQueue}>
              Skip this one →
            </Button>
            {bulkModifyLoadingOpenings && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!bulkModifyLoadingOpenings && bulkModifyAvailableOpenings.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No available openings to switch to.</p>
            )}
            <div className="space-y-3">
              {bulkModifyAvailableOpenings.map((opening) => (
                <Card key={opening.id} className="shadow-soft border-card-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{opening.worker} — {opening.service}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(opening.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {opening.start_time} - {opening.end_time}
                        </span>
                        {opening.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {formatLocation(parseLocation(opening.location))}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={!!bulkModifyModifying}
                      onClick={() => handleBulkModifyOne(opening.id)}
                    >
                      {bulkModifyModifying === opening.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Select'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* Payment Info Dialog */}
      <Dialog open={!!paymentInfoProviderId} onOpenChange={(open) => {
        if (!open) {
          setPaymentInfoProviderId(null);
          setPaymentInfoOpeningId(null);
          setProofSubmitted(false);
          setPaymentProofNote('');
          setPaymentProofPhoto(null);
          setPaymentProofPhotoName('');
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              How to Pay — {paymentInfoProviderName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {(loadingProviderPayments || loadingOrgPayments || loadingPaymentInfoOpening) ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allAvailableMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                This provider hasn't configured payment methods yet.
              </p>
            ) : (
              <Tabs
                defaultValue={
                  (allAvailableMethods.find(m => m.is_default) ?? allAvailableMethods[0])?.id
                }
              >
                <TabsList className="flex flex-wrap h-auto gap-1 mb-3">
                  {allAvailableMethods.map((pm) => (
                    <TabsTrigger key={pm.id} value={pm.id} className="text-xs">
                      {pm.label || getMethodLabel(pm.type)}
                      {pm.is_default && <span className="ml-1 opacity-60">★</span>}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {allAvailableMethods.map((pm) => (
                  <TabsContent key={pm.id} value={pm.id} className="mt-0">
                    <div className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{pm.label}</span>
                        <Badge variant="outline">{getMethodLabel(pm.type)}</Badge>
                        {pm.is_default && <Badge variant="secondary">Default</Badge>}
                      </div>
                      <PaymentDisplay
                        type={pm.type}
                        details={deserializeDetailsByType(pm.type, pm.details)}
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}

            {/* Payment Proof Section */}
            {!loadingProviderPayments && !loadingOrgPayments && (
              <>
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Confirm Payment to Provider
                  </h4>
                  {proofSubmitted ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1">Provider notified!</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                          onClick={() => setProofSubmitted(false)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {loadingExistingProof ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading previous submission…
                        </div>
                      ) : existingPaymentProof && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Previously submitted — editing will resend to provider
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Payment note <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          placeholder="e.g. Sent $50 via PayPal on May 5. Transaction ID: ..."
                          value={paymentProofNote}
                          onChange={(e) => setPaymentProofNote(e.target.value)}
                          rows={3}
                          className="resize-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Attach payment screenshot (optional — auto-compressed to 800×800, &lt;1MB)
                        </label>
                        {paymentProofPhoto ? (
                          <div className="flex items-center gap-2">
                            <img src={paymentProofPhoto} alt="Payment proof" className="w-16 h-16 object-cover rounded border" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{paymentProofPhotoName}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-6 px-0 text-xs"
                                onClick={() => { setPaymentProofPhoto(null); setPaymentProofPhotoName(''); }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to attach screenshot</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePaymentPhotoUpload}
                            />
                          </label>
                        )}
                      </div>
                      <Button
                        onClick={handleSubmitPaymentProof}
                        disabled={isSubmittingProof || !paymentProofNote.trim()}
                        className="w-full"
                        size="sm"
                      >
                        {isSubmittingProof ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                        ) : existingPaymentProof ? (
                          <><Send className="h-4 w-4 mr-2" />Update & Resend to Provider</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" />Submit Payment Update</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Provider Payment Proof Dialog */}
      {(() => {
        const providerViewAppt = providerViewProofAppointmentId
          ? appointments.find(a => a.id === providerViewProofAppointmentId)
          : null;
        return (
          <Dialog open={!!providerViewProofAppointmentId} onOpenChange={(open) => {
            if (!open) {
              setProviderViewProofAppointmentId(null);
              setProofImageError(false);
            }
          }}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                  Payment Proof{providerViewAppt?.booker_name ? ` — ${providerViewAppt.booker_name}` : ''}
                </DialogTitle>
                <DialogDescription>
                  Review the payment confirmation submitted by the customer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {loadingProviderProof ? (
                  <div className="flex items-center justify-center py-8" role="status" aria-label="Loading payment proof">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !providerViewProof ? (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <FileImage className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      No payment proof submitted yet.
                    </p>
                  </div>
                ) : !providerViewProof.photo && !providerViewProof.note ? (
                  <div className="text-center py-6 bg-muted/30 rounded-lg">
                    <FileImage className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      Payment proof record exists but contains no image or note.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {providerViewProof.note && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer Note</p>
                        <div className="bg-muted/50 rounded-md p-3 text-sm text-foreground leading-relaxed">
                          {providerViewProof.note}
                        </div>
                      </div>
                    )}
                    {providerViewProof.photo && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Payment Screenshot</p>
                        {proofImageError ? (
                          <div className="bg-muted/30 rounded-md p-6 text-center border border-dashed border-muted-foreground/30">
                            <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground">Could not load image</p>
                          </div>
                        ) : (
                          <img 
                            src={providerViewProof.photo} 
                            alt="Payment proof submitted by customer" 
                            className="max-w-full rounded-md border shadow-sm" 
                            onError={() => setProofImageError(true)}
                          />
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground pt-2 border-t">
                      Submitted {new Date(providerViewProof.created_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
      </div>
    </div>
  );
}
