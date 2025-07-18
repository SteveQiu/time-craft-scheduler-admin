import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Calendar, Clock, User, MapPin, Star, Search, Filter } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  organization: string;
  skills: string[];
  rating: number;
  location: string;
  avatar: string;
  hourlyRate: number;
}

interface AvailableSlot {
  id: string;
  providerId: string;
  date: string;
  time: string;
  duration: number;
  service: string;
  price: number;
}

export function BookingBrowse() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const providers: Provider[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      organization: 'Elite Hair Salon',
      skills: ['Hair Cut', 'Hair Coloring', 'Styling'],
      rating: 4.9,
      location: 'Downtown',
      avatar: 'SJ',
      hourlyRate: 85
    },
    {
      id: '2',
      name: 'Mike Wilson',
      organization: 'Wellness Center',
      skills: ['Deep Tissue Massage', 'Swedish Massage', 'Sports Therapy'],
      rating: 4.8,
      location: 'Midtown',
      avatar: 'MW',
      hourlyRate: 120
    },
    {
      id: '3',
      name: 'Dr. Lisa Chen',
      organization: 'Health Consultancy',
      skills: ['Health Consultation', 'Nutrition Planning', 'Wellness Coaching'],
      rating: 5.0,
      location: 'Uptown',
      avatar: 'LC',
      hourlyRate: 150
    },
    {
      id: '4',
      name: 'James Rodriguez',
      organization: 'Fitness Pro',
      skills: ['Personal Training', 'Yoga', 'Pilates'],
      rating: 4.7,
      location: 'West Side',
      avatar: 'JR',
      hourlyRate: 75
    }
  ];

  const availableSlots: AvailableSlot[] = [
    { id: '1', providerId: '1', date: '2024-07-18', time: '9:00 AM', duration: 60, service: 'Hair Cut', price: 85 },
    { id: '2', providerId: '1', date: '2024-07-18', time: '11:00 AM', duration: 90, service: 'Hair Coloring', price: 120 },
    { id: '3', providerId: '2', date: '2024-07-18', time: '2:00 PM', duration: 60, service: 'Deep Tissue Massage', price: 120 },
    { id: '4', providerId: '3', date: '2024-07-19', time: '10:00 AM', duration: 45, service: 'Health Consultation', price: 110 },
    { id: '5', providerId: '2', date: '2024-07-19', time: '3:00 PM', duration: 60, service: 'Swedish Massage', price: 120 },
    { id: '6', providerId: '4', date: '2024-07-20', time: '8:00 AM', duration: 60, service: 'Personal Training', price: 75 },
    { id: '7', providerId: '1', date: '2024-07-20', time: '1:00 PM', duration: 60, service: 'Hair Cut', price: 85 },
    { id: '8', providerId: '3', date: '2024-07-20', time: '4:00 PM', duration: 60, service: 'Wellness Coaching', price: 150 }
  ];

  const getProvider = (providerId: string) => providers.find(p => p.id === providerId);

  const filteredSlots = availableSlots.filter(slot => {
    const provider = getProvider(slot.providerId);
    if (!provider) return false;
    
    const matchesSearch = searchTerm === '' || 
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.service.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = selectedDate === '' || slot.date === selectedDate;
    const matchesService = selectedService === '' || slot.service === selectedService;
    
    return matchesSearch && matchesDate && matchesService;
  });

  const uniqueServices = [...new Set(availableSlots.map(slot => slot.service))];

  const handleBooking = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const confirmBooking = () => {
    setShowBookingDialog(false);
    setSelectedSlot(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Browse & Book Appointments</h2>
        <div className="text-sm text-muted-foreground">
          {filteredSlots.length} available slots
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-soft border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search providers or services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Service</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">All Services</option>
                {uniqueServices.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSlots.map((slot) => {
          const provider = getProvider(slot.providerId);
          if (!provider) return null;

          return (
            <Card key={slot.id} className="shadow-soft border-card-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary font-medium">
                      {provider.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">{provider.organization}</p>
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{provider.rating}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    ${slot.price}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(slot.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{slot.time} ({slot.duration}min)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{slot.service}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{provider.location}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {provider.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <Button 
                  onClick={() => handleBooking(slot)}
                  className="w-full"
                >
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSlots.length === 0 && (
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No appointments found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or check back later for new availability.</p>
          </CardContent>
        </Card>
      )}

      {/* Booking Confirmation Dialog */}
      <AlertDialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm your appointment booking details:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {selectedSlot && (
            <div className="space-y-3 py-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Provider:</span>
                <span className="text-sm">{getProvider(selectedSlot.providerId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Service:</span>
                <span className="text-sm">{selectedSlot.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Date:</span>
                <span className="text-sm">{new Date(selectedSlot.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Time:</span>
                <span className="text-sm">{selectedSlot.time} ({selectedSlot.duration}min)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Price:</span>
                <span className="text-sm font-bold">${selectedSlot.price}</span>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <AlertDialogAction onClick={confirmBooking}>
              Confirm Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}