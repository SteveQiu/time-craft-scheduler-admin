import React, { useState } from 'react';
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
import { Search, Filter, Calendar, Clock, User, MapPin, Check, X, CheckCircle, ChevronDown, ChevronUp, Loader2, Mail, Phone, Users, ArrowRightLeft } from 'lucide-react';
import { useOrgWorkers } from '@/hooks/useOrgWorkers';
import { toast } from 'sonner';
import { ModifyAppointmentDialog } from './ModifyAppointmentDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

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
  approved_by?: string | null;
  booker_name?: string | null;
  booker_email?: string | null;
  booker_phone?: string | null;
  booker_slug?: string | null;
  provider_name?: string | null;
  provider_slug?: string | null;
  approved_by_name?: string | null;
}

export function Appointments() {
  const { workers, acceptedWorkers } = useOrgWorkers();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isOrganization, isInternalDev } = useUserRoles();
  const queryClient = useQueryClient();
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

  const modeParam = searchParams.get('mode');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
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
  const activeAppointments = filteredAppointments.filter(
    apt => (apt.status === 'confirmed' || apt.status === 'pending') && apt.date >= today
  );
  const inactiveAppointments = filteredAppointments.filter(
    apt => apt.status === 'completed' || apt.status === 'cancelled' || apt.date < today
  );

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
    const ids = toComplete.map(a => a.id);
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .in('id', ids);
    if (error) {
      toast.error('Failed to complete some appointments');
    } else {
      toast.success(`${ids.length} appointment(s) completed.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
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
      (isOrgView || a.provider_id === user.id)
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

  const renderBookerInfo = (appointment: Appointment) => {
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
                  <span>{first.location}</span>
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
                  {aptIsProvider && (
                    <div className="flex items-center space-x-2">
                      <Button variant="default" size="sm" onClick={() => handleApprove(apt.id)}>
                        <Check className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleCancel(apt.id)}>
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const canManage = isOrgView || appointment.provider_id === user?.id;
    
    return (
      <Card key={appointment.id} className="shadow-soft border-card-border hover:shadow-lg transition-shadow">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
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
                  <span>{appointment.location}</span>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Badge>
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            Reservations
          </h2>
          <p className="text-muted-foreground">
            {isOrgView ? 'Review and manage all bookings' : 'Your booked reservations'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search appointments..."
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
                        {canManageAny && (hasPending || hasConfirmed) && (
                          <Button size="sm" variant="outline" disabled={isBulkActing} onClick={handleStartBulkModify}>
                            <ArrowRightLeft className="h-3 w-3 mr-1" /> Modify ({selectedAppts.filter(a => (a.status === 'pending' || a.status === 'confirmed') && (isOrgView || a.provider_id === user?.id)).length})
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

            {/* Non-pending or user-view appointments */}
            {nonPendingActive.length > 0 ? (
              <div className="space-y-4">{nonPendingActive.map(renderAppointmentCard)}</div>
            ) : (
              !isOrgView || !groupedPendingByOpening || groupedPendingByOpening.size === 0 ? (
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
              className="flex items-center space-x-2 p-0 h-auto hover:bg-transparent"
            >
              <h3 className="text-xl font-semibold text-foreground">Inactive Appointments</h3>
              {showInactive ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
            {showInactive && (
              inactiveAppointments.length > 0 ? (
                <div className="space-y-4">{inactiveAppointments.map(renderAppointmentCard)}</div>
              ) : (
                <Card className="shadow-soft border-card-border">
                  <CardContent className="text-center py-12">
                    <p className="text-lg text-muted-foreground">No inactive appointments</p>
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
                            {opening.location}
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
    </div>
  );
}
