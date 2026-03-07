import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar, Users, Clock, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';
import { WorkerInvites } from './WorkerInvites';

export function Dashboard() {
  const stats = [
    { title: 'Total Appointments', value: '127', icon: Calendar, change: '+12%', trend: 'up' },
    { title: 'Active Workers', value: '8', icon: Users, change: '+2', trend: 'up' },
    { title: 'Today\'s Bookings', value: '24', icon: Clock, change: '+8%', trend: 'up' },
    { title: 'Revenue', value: '$3,420', icon: DollarSign, change: '+15%', trend: 'up' },
  ];

  const recentAppointments = [
    { id: 1, client: 'John Doe', worker: 'Sarah Johnson', service: 'Hair Cut', time: '10:00 AM', status: 'confirmed' },
    { id: 2, client: 'Jane Smith', worker: 'Mike Wilson', service: 'Massage', time: '2:00 PM', status: 'pending' },
    { id: 3, client: 'Bob Johnson', worker: 'Lisa Chen', service: 'Consultation', time: '4:30 PM', status: 'confirmed' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Welcome to your appointment management system</p>
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
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-success">{stat.change}</span>
                  <span className="text-muted-foreground ml-1">from last month</span>
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
          <div className="space-y-4">
            {recentAppointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-medium">
                        {appointment.client.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{appointment.client}</p>
                    <p className="text-sm text-muted-foreground">{appointment.service} with {appointment.worker}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-foreground">{appointment.time}</span>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    appointment.status === 'confirmed' 
                      ? 'bg-success-light text-success' 
                      : 'bg-warning-light text-warning'
                  }`}>
                    {appointment.status === 'confirmed' && <CheckCircle className="h-3 w-3" />}
                    <span className="capitalize">{appointment.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}