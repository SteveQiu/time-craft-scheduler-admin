import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar, Users, Clock, DollarSign, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { WorkerInvites } from './WorkerInvites';
import { PremiumUpgrade } from './PremiumUpgrade';
import { useOrgPlan } from '@/hooks/useOrgPlan';

export function Dashboard() {
  const { user } = useAuth();
  const { plan } = useOrgPlan(user?.id || null);

  // Fetch user's appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['dashboard-appointments', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })
        .limit(10);
      
      if (error) throw error;

      const providerIds = [...new Set((data || []).map((appointment) => appointment.provider_id))];
      let providerNames = new Map<string, string>();

      if (providerIds.length > 0) {
        const { data: profiles } = await supabase.rpc('get_public_profile_names', { profile_ids: providerIds });
        providerNames = new Map((profiles || []).map((profile) => [profile.id, profile.full_name || 'Unknown']));
      }

      return (data || []).map((appointment) => ({
        ...appointment,
        provider_name: providerNames.get(appointment.provider_id) || 'Unknown',
      }));
    },
  });

  // Calculate stats
  const totalAppointments = appointments.length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === today);

  const stats = [
    { title: 'Total Appointments', value: totalAppointments.toString(), icon: Calendar, change: '—', trend: 'neutral' },
    { title: 'Confirmed', value: confirmedCount.toString(), icon: CheckCircle, change: confirmedCount > 0 ? '+' + confirmedCount : '0', trend: 'up' },
    { title: 'Today\'s Bookings', value: todayAppointments.length.toString(), icon: Clock, change: todayAppointments.length > 0 ? '+' + todayAppointments.length : '0', trend: 'up' },
    { title: 'Pending', value: pendingCount.toString(), icon: Users, change: pendingCount > 0 ? '+' + pendingCount : '0', trend: 'neutral' },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Your appointment overview</p>
        </div>
        <PremiumUpgrade orgId={user?.id || null} />
      </div>

      {/* Worker Invites */}
      <WorkerInvites />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-soft border-card-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center text-sm">
                  {stat.trend === 'up' && <TrendingUp className="h-3 w-3 text-success mr-1" />}
                  <span className={stat.trend === 'up' ? 'text-success' : 'text-muted-foreground'}>{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Appointments */}
      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No appointments yet</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-medium text-xs">
                          {appointment.provider_name.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.provider_name}</p>
                      <p className="text-sm text-muted-foreground">{appointment.service} • {appointment.date}</p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    appointment.status === 'confirmed' 
                      ? 'bg-success-light text-success' 
                      : appointment.status === 'pending'
                      ? 'bg-warning-light text-warning'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {appointment.status === 'confirmed' && <CheckCircle className="h-3 w-3" />}
                    <span className="capitalize">{appointment.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}