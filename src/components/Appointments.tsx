import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Search, Filter, Calendar, Clock, User, MapPin, Check, X, CheckCircle, ChevronDown, ChevronUp, Loader2, Mail, Phone } from 'lucide-react';
import { useOrgWorkers } from '@/hooks/useOrgWorkers';

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
  booker_name?: string | null;
  booker_email?: string | null;
  booker_phone?: string | null;
  booker_slug?: string | null;
  provider_name?: string | null;
  provider_slug?: string | null;
}

export function Appointments() {
  const { workers } = useOrgWorkers();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isOrganization, isInternalDev } = useUserRoles();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  // Determine if viewing as org (provider) or user (booker)
  const modeParam = searchParams.get('mode');
  const isOrgView = modeParam === 'org' && (isOrganization || isInternalDev);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', user?.id, isOrgView],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: false })
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Fetch profile data for providers and bookers
      const providerIds = [...new Set((data || []).map((a: any) => a.provider_id))];
      const bookerIds = [...new Set((data || []).map((a: any) => a.user_id))];
      const allIds = [...new Set([...providerIds, ...bookerIds])];
      
      let profileMap = new Map<string, { full_name: string; slug: string | null }>();
      if (allIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_public_profile_names', { profile_ids: allIds });
        profileMap = new Map((profiles || []).map((p: any) => [p.id, { full_name: p.full_name, slug: p.slug }]));
      }

      // Fetch booker contact info from profiles (RLS allows viewing appointment participants)
      let bookerContactMap = new Map<string, { email: string | null; phone: string | null }>();
      if (bookerIds.length > 0) {
        const { data: bookerProfiles } = await supabase
          .from('profiles')
          .select('id, email, phone')
          .in('id', bookerIds);
        bookerContactMap = new Map((bookerProfiles || []).map((p: any) => [p.id, { email: p.email, phone: p.phone }]));
      }

      return (data || []).map((a: any) => ({
        ...a,
        provider_slug: profileMap.get(a.provider_id)?.slug || null,
        booker_name: profileMap.get(a.user_id)?.full_name || null,
        booker_slug: profileMap.get(a.user_id)?.slug || null,
        booker_email: bookerContactMap.get(a.user_id)?.email || null,
        booker_phone: bookerContactMap.get(a.user_id)?.phone || null,
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

  const handleSelectAppointment = (id: string) => {
    setSelectedAppointments(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedAppointments(
      selectedAppointments.length === activeAppointments.length
        ? []
        : activeAppointments.map(apt => apt.id)
    );
  };

  const updateStatus = async (ids: string[], status: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .in('id', ids);
    if (!error) {
      // If cancelling, re-open the openings
      if (status === 'cancelled') {
        const openingIds = appointments
          .filter(a => ids.includes(a.id))
          .map(a => a.opening_id);
        await supabase
          .from('openings')
          .update({ is_available: true })
          .in('id', openingIds);
      }
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointments([]);
    }
  };

  const handleApprove = () => updateStatus(selectedAppointments, 'confirmed');
  const handleReject = () => updateStatus(selectedAppointments, 'cancelled');
  const handleComplete = (id: string) => updateStatus([id], 'completed');

  const renderAppointmentCard = (appointment: Appointment) => {
    const bookerSlug = appointment.booker_slug;
    
    return (
      <Card key={appointment.id} className="shadow-soft border-card-border hover:shadow-lg transition-shadow">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              {isOrgView && (appointment.status === 'confirmed' || appointment.status === 'pending') && (
                <Checkbox
                  checked={selectedAppointments.includes(appointment.id)}
                  onCheckedChange={() => handleSelectAppointment(appointment.id)}
                />
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
                  <span>{appointment.location}</span>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Badge className={getStatusColor(appointment.status)}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Badge>
                {isOrgView && appointment.status === 'confirmed' && (
                  <Button variant="default" size="sm" onClick={() => handleComplete(appointment.id)}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Customer info for org view */}
          {isOrgView && appointment.booker_name && (
            <div className="border-t border-border pt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Customer:</span>
                {bookerSlug ? (
                  <span
                    className="text-sm font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => navigate(`/profile/${bookerSlug}`)}
                  >
                    {appointment.booker_name}
                  </span>
                ) : (
                  <span
                    className="text-sm font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => navigate(`/profile/${appointment.user_id}`)}
                  >
                    {appointment.booker_name}
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
            {isOrgView ? 'Manage Appointments' : 'My Appointments'}
          </h2>
          <p className="text-muted-foreground">
            {isOrgView ? 'Review and manage bookings' : 'Your booked appointments'}
          </p>
        </div>
        {isOrgView && selectedAppointments.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button variant="default" onClick={handleApprove}>
              <Check className="h-4 w-4 mr-1" />
              Approve ({selectedAppointments.length})
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="h-4 w-4 mr-1" />
              Reject ({selectedAppointments.length})
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {isOrgView && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedAppointments.length === activeAppointments.length && activeAppointments.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              <Select value={workerFilter} onValueChange={setWorkerFilter}>
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
              <Badge variant="outline">{activeAppointments.length}</Badge>
            </div>
            {activeAppointments.length > 0 ? (
              <div className="space-y-4">{activeAppointments.map(renderAppointmentCard)}</div>
            ) : (
              <Card className="shadow-soft border-card-border">
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg text-muted-foreground">No active appointments</p>
                </CardContent>
              </Card>
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
    </div>
  );
}
