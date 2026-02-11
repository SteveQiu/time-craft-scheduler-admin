import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Search, Filter, Calendar, Clock, User, Phone, Mail, Check, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  workerName: string;
  service: string;
  date: string;
  time: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes?: string;
}

export function Appointments() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: '1',
      clientName: 'John Doe',
      clientEmail: 'john@example.com',
      clientPhone: '+1 (555) 111-2222',
      workerName: 'Sarah Johnson',
      service: 'Hair Cut',
      date: '2024-01-15',
      time: '10:00 AM',
      duration: 60,
      status: 'confirmed',
      notes: 'Regular customer, prefers short style'
    },
    {
      id: '2',
      clientName: 'Jane Smith',
      clientEmail: 'jane@example.com',
      clientPhone: '+1 (555) 333-4444',
      workerName: 'Mike Wilson',
      service: 'Deep Tissue Massage',
      date: '2024-01-15',
      time: '2:00 PM',
      duration: 90,
      status: 'pending',
      notes: 'First time client, focusing on lower back pain'
    },
    {
      id: '3',
      clientName: 'Bob Johnson',
      clientEmail: 'bob@example.com',
      clientPhone: '+1 (555) 555-6666',
      workerName: 'Lisa Chen',
      service: 'Business Consultation',
      date: '2024-01-15',
      time: '4:30 PM',
      duration: 120,
      status: 'confirmed',
      notes: 'Startup strategy discussion'
    },
    {
      id: '4',
      clientName: 'Alice Williams',
      clientEmail: 'alice@example.com',
      clientPhone: '+1 (555) 777-8888',
      workerName: 'David Rodriguez',
      service: 'Personal Training',
      date: '2024-01-16',
      time: '8:00 AM',
      duration: 60,
      status: 'completed'
    },
    {
      id: '5',
      clientName: 'Charlie Brown',
      clientEmail: 'charlie@example.com',
      clientPhone: '+1 (555) 999-0000',
      workerName: 'Sarah Johnson',
      service: 'Hair Color',
      date: '2024-01-16',
      time: '11:00 AM',
      duration: 120,
      status: 'cancelled',
      notes: 'Client cancelled due to illness'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success-light text-success';
      case 'pending': return 'bg-warning-light text-warning';
      case 'cancelled': return 'bg-destructive-light text-destructive';
      case 'completed': return 'bg-primary-light text-primary';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch = 
      appointment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.workerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.service.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Separate active and inactive appointments
  const today = new Date().toISOString().split('T')[0];
  const activeAppointments = filteredAppointments.filter(
    apt => (apt.status === 'confirmed' || apt.status === 'pending') && apt.date >= today
  );
  
  const inactiveAppointments = filteredAppointments.filter(
    apt => apt.status === 'completed' || apt.status === 'cancelled' || apt.date < today
  );

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointments(prev => 
      prev.includes(appointmentId) 
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedAppointments(
      selectedAppointments.length === activeAppointments.length 
        ? [] 
        : activeAppointments.map(apt => apt.id)
    );
  };

  const handleApprove = () => {
    setAppointments(prev => 
      prev.map(appointment => 
        selectedAppointments.includes(appointment.id) && appointment.status === 'pending'
          ? { ...appointment, status: 'confirmed' as const }
          : appointment
      )
    );
    setSelectedAppointments([]);
  };

  const handleReject = () => {
    setAppointments(prev => 
      prev.map(appointment => 
        selectedAppointments.includes(appointment.id) && appointment.status === 'pending'
          ? { ...appointment, status: 'cancelled' as const }
          : appointment
      )
    );
    setSelectedAppointments([]);
  };

  const handleComplete = (appointmentId: string) => {
    setAppointments(prev => 
      prev.map(appointment => 
        appointment.id === appointmentId && appointment.status === 'confirmed'
          ? { ...appointment, status: 'completed' as const }
          : appointment
      )
    );
  };

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id} className="shadow-soft border-card-border hover:shadow-medium transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          {/* Client Info */}
          <div className="flex items-center space-x-4">
            {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
              <Checkbox
                checked={selectedAppointments.includes(appointment.id)}
                onCheckedChange={() => handleSelectAppointment(appointment.id)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            )}
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-semibold">
                {appointment.clientName.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{appointment.clientName}</h3>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Mail className="h-3 w-3" />
                  <span>{appointment.clientEmail}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Phone className="h-3 w-3" />
                  <span>{appointment.clientPhone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="text-center sm:text-left">
              <p className="font-medium text-foreground">{appointment.service}</p>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{appointment.workerName}</span>
              </div>
            </div>

            <div className="text-center sm:text-left">
              <div className="flex items-center space-x-1 text-sm font-medium text-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(appointment.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{appointment.time} ({appointment.duration}min)</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(appointment.status)}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
              <div className="flex gap-1">
                {appointment.status === 'confirmed' && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleComplete(appointment.id)}
                    className="flex items-center space-x-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>Complete</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/appointments/${appointment.id}`)}
                >
                  View
                </Button>
              </div>
            </div>
          </div>
        </div>

        {appointment.notes && (
          <div className="mt-4 p-3 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Notes:</strong> {appointment.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Appointments</h2>
          <p className="text-muted-foreground">Manage all your bookings</p>
        </div>
        <div className="flex items-center space-x-2">
          {selectedAppointments.length > 0 && (
            <>
              <Button 
                variant="default" 
                className="flex items-center space-x-2"
                onClick={handleApprove}
              >
                <Check className="h-4 w-4" />
                <span>Approve ({selectedAppointments.length})</span>
              </Button>
              <Button 
                variant="destructive" 
                className="flex items-center space-x-2"
                onClick={handleReject}
              >
                <X className="h-4 w-4" />
                <span>Reject ({selectedAppointments.length})</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-soft border-card-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedAppointments.length === activeAppointments.length && activeAppointments.length > 0}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>
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
          </div>
        </CardContent>
      </Card>

      {/* Active Appointments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-foreground">Active Appointments</h3>
          <Badge variant="outline" className="text-sm">
            {activeAppointments.length} {activeAppointments.length === 1 ? 'appointment' : 'appointments'}
          </Badge>
        </div>
        
        {activeAppointments.length > 0 ? (
          <div className="space-y-4">
            {activeAppointments.map(renderAppointmentCard)}
          </div>
        ) : (
          <Card className="shadow-soft border-card-border">
            <CardContent className="text-center py-12">
              <div className="text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No active appointments</p>
                <p className="text-sm">Confirmed and pending appointments will appear here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Inactive Appointments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center space-x-2 p-0 h-auto hover:bg-transparent"
          >
            <h3 className="text-xl font-semibold text-foreground">Inactive Appointments</h3>
            {showInactive ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
          <Badge variant="outline" className="text-sm">
            {inactiveAppointments.length} {inactiveAppointments.length === 1 ? 'appointment' : 'appointments'}
          </Badge>
        </div>
        
        {showInactive && (
          <>
            {inactiveAppointments.length > 0 ? (
              <div className="space-y-4">
                {inactiveAppointments.map(renderAppointmentCard)}
              </div>
            ) : (
              <Card className="shadow-soft border-card-border">
                <CardContent className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No inactive appointments</p>
                    <p className="text-sm">Completed and cancelled appointments will appear here</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}