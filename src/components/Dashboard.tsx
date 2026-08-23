import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Clock, DollarSign, Loader2, Star, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WorkerInvites } from './WorkerInvites';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');

  // Fetch all appointments (as booker + as provider)
  const { data: allAppointments = [], isLoading } = useQuery({
    queryKey: ['dashboard-all-appointments', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`user_id.eq.${user!.id},provider_id.eq.${user!.id}`)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;

      const providerIds = [...new Set((data || []).map(a => a.provider_id))];
      const bookerIds = [...new Set((data || []).map(a => a.user_id))];
      const allIds = [...new Set([...providerIds, ...bookerIds])];
      let nameMap = new Map<string, string>();

      if (allIds.length > 0) {
        const { data: profiles } = await supabase.rpc('get_public_profile_names', { profile_ids: allIds });
        nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));
      }

      return (data || []).map(a => ({
        ...a,
        provider_name: nameMap.get(a.provider_id) || 'Unknown',
        booker_name: nameMap.get(a.user_id) || 'Unknown',
      }));
    },
  });

  // Fetch reviews received
  const { data: reviewStats } = useQuery({
    queryKey: ['dashboard-reviews', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_id', user!.id);
      if (error || !data || data.length === 0) return { avg: 0, count: 0 };
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: data.length };
    },
  });

  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const weekEnd = weekFromNow.toISOString().split('T')[0];

  // Global time range filter
  const getRangeStart = () => {
    const d = new Date();
    if (timeRange === 'day') return d.toISOString().split('T')[0];
    if (timeRange === 'week') { d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; }
    if (timeRange === 'month') { d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; }
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  };
  const rangeStart = getRangeStart();
  const rangeLabel = timeRange === 'day' ? 'today' : timeRange === 'week' ? 'past 7 days' : timeRange === 'month' ? 'past 30 days' : 'past year';

  // Filter all appointments by time range
  const rangedAppointments = allAppointments.filter(a => a.date >= rangeStart);

  // Split by role (within range)
  const asProvider = rangedAppointments.filter(a => a.provider_id === user?.id);

  // Upcoming (today and future, confirmed or pending) — always forward-looking within range
  const upcoming = rangedAppointments
    .filter(a => a.date >= today && (a.status === 'confirmed' || a.status === 'pending'))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  const todayAppointments = upcoming.filter(a => a.date === today);
  const thisWeek = upcoming.filter(a => a.date > today && a.date <= weekEnd);

  // Potential revenue from confirmed/pending/completed where user is provider
  const revenueAppointments = asProvider.filter(a =>
    a.status === 'confirmed' || a.status === 'pending' || a.status === 'completed'
  );
  const potentialRevenue = revenueAppointments.reduce((sum, a) => sum + (a.total || 0), 0);

  // Pending actions
  const pendingAsProvider = asProvider.filter(a => a.status === 'pending');

  // Stats
  const stats = [
    {
      title: 'Today',
      value: todayAppointments.length.toString(),
      icon: Clock,
      sub: todayAppointments.length === 1 ? 'appointment' : 'appointments',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Approval',
      value: pendingAsProvider.length.toString(),
      icon: Users,
      sub: 'need your action',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Potential Revenue',
      value: `$${potentialRevenue.toFixed(0)}`,
      icon: DollarSign,
      sub: `${revenueAppointments.length} bookings · ${rangeLabel}`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Rating',
      value: reviewStats?.avg ? `${reviewStats.avg}` : '—',
      icon: Star,
      sub: reviewStats?.count ? `${reviewStats.count} reviews` : 'no reviews yet',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatTime = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${m} ${ampm}`;
  };

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isProvider = (a: any) => a.provider_id === user?.id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-1">Dashboard</h2>
          <p className="text-muted-foreground">
            {todayAppointments.length > 0
              ? `You have ${todayAppointments.length} appointment${todayAppointments.length > 1 ? 's' : ''} today`
              : 'No appointments today'}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month', 'year'] as const).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                timeRange === r
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'day' ? 'Today' : r === 'week' ? '7 Days' : r === 'month' ? '30 Days' : '1 Year'}
            </button>
          ))}
        </div>
      </div>

      <WorkerInvites />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-soft border-card-border">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Appointments */}
        <Card className="shadow-soft border-card-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Upcoming</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')} className="text-xs gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today</p>
                )}
                {todayAppointments.slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {isProvider(a) ? a.booker_name : a.provider_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.service} • {formatTime(a.start_time)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isProvider(a) ? '📥 Provider' : '📤 Booked'}
                    </span>
                  </div>
                ))}

                {thisWeek.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">This Week</p>
                )}
                {thisWeek.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {isProvider(a) ? a.booker_name : a.provider_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.service} • {formatDate(a.date)} {formatTime(a.start_time)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-soft border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {rangedAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 text-sm">No activity in {rangeLabel}</p>
            ) : (
              <div className="space-y-3">
                {rangedAppointments.slice(0, 7).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-2">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        a.status === 'completed' ? 'bg-green-100 text-green-700'
                          : a.status === 'confirmed' ? 'bg-blue-100 text-blue-700'
                          : a.status === 'cancelled' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {(isProvider(a) ? a.booker_name : a.provider_name).split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">
                        <span className="font-medium">{isProvider(a) ? a.booker_name : a.provider_name}</span>
                        {' — '}{a.service}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(a.date)} • {isProvider(a) ? 'You provided' : 'You booked'}
                        {a.total ? ` • $${a.total}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs capitalize ${
                      a.status === 'completed' ? 'text-green-600'
                        : a.status === 'confirmed' ? 'text-blue-600'
                        : a.status === 'cancelled' ? 'text-red-500'
                        : 'text-amber-600'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}