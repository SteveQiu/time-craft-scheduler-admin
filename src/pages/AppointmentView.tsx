import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Calendar, Clock, User, Phone, Mail, Send } from 'lucide-react';
import { DATE_FORMATS, LOCALE } from '@/config/formats';

// Mock data - in production this would come from Supabase
const mockAppointments = [
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
    status: 'confirmed' as const,
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
    status: 'pending' as const,
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
    status: 'confirmed' as const,
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
    status: 'completed' as const
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
    status: 'cancelled' as const,
    notes: 'Client cancelled due to illness'
  }
];

export function AppointmentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'client', text: 'Hi, I wanted to confirm my appointment time.', timestamp: '10:30 AM' },
    { id: '2', sender: 'admin', text: 'Hello! Yes, your appointment is confirmed for 10:00 AM on January 15th.', timestamp: '10:32 AM' },
    { id: '3', sender: 'client', text: 'Perfect, thank you!', timestamp: '10:33 AM' },
  ]);
  
  const appointment = mockAppointments.find(apt => apt.id === id);

  const handleSendMessage = () => {
    if (message.trim()) {
      setChatMessages([...chatMessages, {
        id: Date.now().toString(),
        sender: 'admin',
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setMessage('');
    }
  };

  if (!appointment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Appointment not found</p>
            <Button onClick={() => navigate('/appointments')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success-light text-success';
      case 'pending': return 'bg-warning-light text-warning';
      case 'cancelled': return 'bg-destructive-light text-destructive';
      case 'completed': return 'bg-primary-light text-primary';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/appointments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>
        <Badge className={getStatusColor(appointment.status)}>
          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {/* Left Column - Appointment Details */}
        <div className="lg:col-span-2">
          <Card className="shadow-soft border-card-border">
            <CardHeader>
              <CardTitle className="text-2xl">Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Information */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Client Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-semibold">
                        {appointment.clientName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.clientName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${appointment.clientEmail}`} className="hover:text-primary transition-colors">
                      {appointment.clientEmail}
                    </a>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${appointment.clientPhone}`} className="hover:text-primary transition-colors">
                      {appointment.clientPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Service Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Service</p>
                    <p className="font-medium text-foreground">{appointment.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-foreground">{appointment.workerName}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{appointment.duration} minutes</p>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Schedule</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-foreground">
                      {new Date(appointment.date).toLocaleDateString(LOCALE, DATE_FORMATS.long)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-foreground">{appointment.time}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Notes</h3>
                  <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-muted-foreground">{appointment.notes}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="default" className="flex-1">
                  Reschedule
                </Button>
                <Button variant="outline" className="flex-1">
                  Cancel Appointment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Chat Box */}
        <div className="lg:col-span-1">
          <Card className="shadow-soft border-card-border h-[calc(100vh-12rem)] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">Chat with {appointment.clientName}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-4 py-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.sender === 'admin'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{msg.timestamp}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-card-border">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button size="icon" onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
