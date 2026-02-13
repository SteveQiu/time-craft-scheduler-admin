import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Calendar as CalendarIcon, Clock, User, MapPin, Search, Filter, Loader2 } from 'lucide-react';

interface OpeningWithProfile {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  service: string;
  worker: string;
  is_available: boolean;
  location: string | null;
  provider_name: string | null;
  provider_email: string | null;
}

export function BookingBrowse() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<OpeningWithProfile | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const { data: openings = [], isLoading } = useQuery({
    queryKey: ['browse-openings', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('*, profiles!openings_user_id_fkey(full_name, email)')
        .eq('is_available', true)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      return (data || []).map((opening: any) => ({
        id: opening.id,
        user_id: opening.user_id,
        date: opening.date,
        start_time: opening.start_time,
        end_time: opening.end_time,
        duration: opening.duration,
        service: opening.service,
        worker: opening.worker,
        is_available: opening.is_available,
        location: opening.location || null,
        provider_name: opening.profiles?.full_name || null,
        provider_email: opening.profiles?.email || null,
      }));
    },
  });

  const uniqueServices = [...new Set(openings.map(o => o.service))];
  const uniqueLocations = [...new Set(openings.map(o => o.location).filter(Boolean))] as string[];

  const filteredSlots = openings.filter(slot => {
    const matchesSearch = searchTerm === '' ||
      slot.worker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slot.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (slot.provider_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (slot.location || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesService = selectedService === '' || slot.service === selectedService;
    const matchesLocation = selectedLocation === '' || slot.location === selectedLocation;

    return matchesSearch && matchesService && matchesLocation;
  });

  const handleBooking = (slot: OpeningWithProfile) => {
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const [isBooking, setIsBooking] = useState(false);

  const confirmBooking = async () => {
    if (!selectedSlot || !user) return;
    setIsBooking(true);
    try {
      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          opening_id: selectedSlot.id,
          user_id: user.id,
          provider_id: selectedSlot.user_id,
          worker: selectedSlot.worker,
          service: selectedSlot.service,
          location: selectedSlot.location,
          date: selectedSlot.date,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          duration: selectedSlot.duration,
          status: 'pending',
        });
      if (appointmentError) throw appointmentError;

      // Mark opening as unavailable
      const { error: updateError } = await supabase
        .from('openings')
        .update({ is_available: false })
        .eq('id', selectedSlot.id);
      if (updateError) throw updateError;

      setShowBookingDialog(false);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setIsBooking(false);
    }
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
                  placeholder="Search workers, services, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Available Appointments */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSlots.map((slot) => (
            <Card key={slot.id} className="shadow-soft border-card-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {slot.worker.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{slot.worker}</h3>
                      <p className="text-sm text-muted-foreground">{slot.provider_name || 'Organization'}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{slot.service}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(slot.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{slot.start_time} - {slot.end_time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{slot.duration} min</span>
                  </div>
                  {slot.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{slot.location}</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => handleBooking(slot)}
                  className="w-full"
                >
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredSlots.length === 0 && (
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                <span className="text-sm font-medium">Worker:</span>
                <span className="text-sm">{selectedSlot.worker}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Service:</span>
                <span className="text-sm">{selectedSlot.service}</span>
              </div>
              {selectedSlot.location && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Location:</span>
                  <span className="text-sm">{selectedSlot.location}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm font-medium">Date:</span>
                <span className="text-sm">{new Date(selectedSlot.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Time:</span>
                <span className="text-sm">{selectedSlot.start_time} - {selectedSlot.end_time} ({selectedSlot.duration}min)</span>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <AlertDialogAction onClick={confirmBooking} disabled={isBooking}>
              {isBooking ? 'Booking...' : 'Confirm Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}