import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Calendar as CalendarIcon, Clock, User, MapPin, Search, Filter, Loader2, Share2, ExternalLink, ChevronRight, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

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
  hourly_rate: number;
  provider_name: string | null;
  provider_email: string | null;
  provider_slug: string | null;
}

interface ProviderAccount {
  user_id: string;
  provider_name: string;
  provider_slug: string | null;
  opening_count: number;
  services: string[];
  workers: string[];
}

export function BookingBrowse() {
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId?: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<OpeningWithProfile | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Fetch all openings
  const { data: allOpenings = [], isLoading: openingsLoading } = useQuery({
    queryKey: ['browse-openings', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('*')
        .eq('is_available', true)
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Filter out openings that already have pending appointments
      const openingIds = (data || []).map((o: any) => o.id);
      let pendingSet = new Set<string>();
      if (openingIds.length > 0) {
        const { data: pendingAppts } = await supabase
          .from('appointments')
          .select('opening_id')
          .in('opening_id', openingIds)
          .eq('status', 'pending');
        pendingSet = new Set((pendingAppts || []).map((a: any) => a.opening_id));
      }

      const availableData = (data || []).filter((o: any) => !pendingSet.has(o.id));

      // Fetch provider names via RPC (safe, only returns public fields)
      const providerIds = [...new Set(availableData.map((o: any) => o.user_id))];
      let nameMap = new Map<string, string>();
      let slugMap = new Map<string, string>();
      if (providerIds.length > 0) {
        const { data: profiles } = await supabase
          .rpc('get_public_profile_names', { profile_ids: providerIds });
        nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
        slugMap = new Map((profiles || []).filter((p: any) => p.slug).map((p: any) => [p.id, p.slug]));
      }

      return availableData.map((opening: any) => ({
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
        hourly_rate: opening.hourly_rate || 0,
        provider_name: nameMap.get(opening.user_id) || null,
        provider_email: null,
        provider_slug: slugMap.get(opening.user_id) || null,
      }));
    },
  });

  // Group openings by provider
  const providers: ProviderAccount[] = React.useMemo(() => {
    const providerMap = new Map<string, ProviderAccount>();
    
    allOpenings.forEach(opening => {
      if (!providerMap.has(opening.user_id)) {
        providerMap.set(opening.user_id, {
          user_id: opening.user_id,
          provider_name: opening.provider_name || 'Organization',
          provider_slug: opening.provider_slug || null,
          opening_count: 0,
          services: [],
          workers: [],
        });
      }
      
      const provider = providerMap.get(opening.user_id)!;
      provider.opening_count += 1;
      
      if (!provider.services.includes(opening.service)) {
        provider.services.push(opening.service);
      }
      if (!provider.workers.includes(opening.worker)) {
        provider.workers.push(opening.worker);
      }
    });

    return Array.from(providerMap.values()).sort((a, b) => 
      b.opening_count - a.opening_count
    );
  }, [allOpenings]);

  // Get openings for selected provider
  const selectedProviderOpenings = providerId 
    ? allOpenings.filter(o => o.user_id === providerId)
    : [];

  // Filter providers by search term
  const filteredProviders = providers.filter(provider =>
    searchTerm === '' ||
    provider.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.services.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
    provider.workers.some(w => w.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleBooking = (slot: OpeningWithProfile) => {
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

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
      toast.success('Appointment booked!');
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Failed to book appointment');
    } finally {
      setIsBooking(false);
    }
  };

  if (openingsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Provider List View
  if (!providerId) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Browse & Book</h2>
          <div className="text-sm text-muted-foreground">
            {providers.length} providers · {allOpenings.length} available slots
          </div>
        </div>

        {/* Search */}
        <Card className="shadow-soft border-card-border">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers, services, workers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <Card className="shadow-soft border-card-border">
            <CardContent className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No providers found</h3>
              <p className="text-muted-foreground">Try adjusting your search or check back later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => (
              <Card 
                key={provider.user_id} 
                className="shadow-soft border-card-border hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/browse/${provider.user_id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium"
                      >
                        {provider.provider_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate hover:underline">
                          {provider.provider_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {provider.opening_count} available slots
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Services</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.services.slice(0, 3).map(service => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                      {provider.services.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{provider.services.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Workers</p>
                    <p className="text-sm text-foreground truncate">
                      {provider.workers.join(', ')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Openings View for Selected Provider
  const currentProvider = providers.find(p => p.user_id === providerId);

  // Group openings by service
  const serviceMap = React.useMemo(() => {
    const map = new Map<string, OpeningWithProfile[]>();
    selectedProviderOpenings.forEach(opening => {
      if (!map.has(opening.service)) {
        map.set(opening.service, []);
      }
      map.get(opening.service)!.push(opening);
    });
    return map;
  }, [selectedProviderOpenings]);

  // Get workers for selected service
  const workersForService = React.useMemo(() => {
    if (!selectedService) return [];
    const openings = serviceMap.get(selectedService) || [];
    const workers = [...new Set(openings.map(o => o.worker))];
    return workers;
  }, [selectedService, serviceMap]);

  // Get dates for selected service & worker
  const datesForServiceAndWorker = React.useMemo(() => {
    if (!selectedService || !selectedWorker) return [];
    const openings = selectedProviderOpenings.filter(
      o => o.service === selectedService && o.worker === selectedWorker
    );
    const dates = [...new Set(openings.map(o => o.date))].sort();
    return dates;
  }, [selectedService, selectedWorker, selectedProviderOpenings]);

  // Get times for selected service, worker & date
  const timesForSelection = React.useMemo(() => {
    if (!selectedService || !selectedWorker || !selectedDate) return [];
    return selectedProviderOpenings.filter(
      o => o.service === selectedService && o.worker === selectedWorker && o.date === selectedDate
    );
  }, [selectedService, selectedWorker, selectedDate, selectedProviderOpenings]);

  // Get all available dates to highlight in calendar
  const allAvailableDates = React.useMemo(() => {
    if (!selectedService) return new Set<string>();
    const openings = serviceMap.get(selectedService) || [];
    
    if (selectedWorker) {
      // If worker is selected, filter to that worker's dates
      return new Set(openings.filter(o => o.worker === selectedWorker).map(o => o.date));
    }
    
    // Otherwise show all dates for all workers of this service
    return new Set(openings.map(o => o.date));
  }, [selectedService, selectedWorker, serviceMap]);

  // Get min/max dates for calendar
  const calendarDateRange = React.useMemo(() => {
    if (allAvailableDates.size === 0) {
      const today = new Date();
      return { start: new Date(today), end: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) };
    }
    const dates = Array.from(allAvailableDates).map(d => new Date(d));
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    return { start, end };
  }, [allAvailableDates]);

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const days: (Date | null)[] = [];
    const current = new Date(calendarDateRange.start);
    const firstDayOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 42; i++) {
      days.push(new Date(startDate));
      startDate.setDate(startDate.getDate() + 1);
    }
    return days;
  }, [calendarDateRange]);

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const handleResetSelection = () => {
    setSelectedService(null);
    setSelectedWorker(null);
    setSelectedDate(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/browse')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground">{currentProvider?.provider_name}</h2>
          <p className="text-sm text-muted-foreground">{selectedProviderOpenings.length} available appointments</p>
        </div>
      </div>

      {selectedProviderOpenings.length === 0 ? (
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No appointments available</h3>
            <p className="text-muted-foreground">Check back later for new availability.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Services</h3>
            {Array.from(serviceMap.keys()).map(service => (
              <Card 
                key={service}
                className={`cursor-pointer transition-all ${
                  selectedService === service 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50 border-card-border'
                }`}
                onClick={() => {
                  setSelectedService(selectedService === service ? null : service);
                  setSelectedWorker(null);
                  setSelectedDate(null);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{service}</span>
                    <span className="text-xs text-muted-foreground">
                      {(serviceMap.get(service) || []).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Workers & Calendar Section */}
          {selectedService && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Workers</h3>
              {workersForService.map(worker => (
                <Card 
                  key={worker}
                  className={`cursor-pointer transition-all ${
                    selectedWorker === worker 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50 border-card-border'
                  }`}
                  onClick={() => {
                    setSelectedWorker(selectedWorker === worker ? null : worker);
                    setSelectedDate(null);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                        {worker.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{worker}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Calendar Section */}
          {selectedService && selectedWorker && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Available Dates</h3>
              
              {/* Mini Calendar */}
              <Card className="shadow-soft border-card-border p-4 space-y-3">
                <div className="text-sm font-medium text-foreground">
                  {calendarDateRange.start.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 text-xs font-medium text-muted-foreground text-center mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day}>{day}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    const isCurrentMonth = day && day.getMonth() === calendarDateRange.start.getMonth();
                    const dateKey = day ? formatDateKey(day) : null;
                    const isAvailable = dateKey ? allAvailableDates.has(dateKey) : false;
                    const isSelected = dateKey === selectedDate;

                    return (
                      <button
                        key={idx}
                        onClick={() => isAvailable && setSelectedDate(dateKey)}
                        disabled={!isAvailable}
                        className={`py-2 text-xs rounded transition-all ${
                          !isCurrentMonth ? 'text-muted-foreground/30 cursor-default' :
                          !isAvailable ? 'text-muted-foreground/50 cursor-not-allowed' :
                          isSelected ? 'bg-primary text-primary-foreground font-semibold' :
                          'bg-primary/10 text-primary hover:bg-primary/20 font-medium cursor-pointer'
                        }`}
                      >
                        {day?.getDate()}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Time Slots Section */}
      {selectedDate && timesForSelection.length > 0 && (
        <Card className="shadow-soft border-card-border">
          <CardHeader>
            <div>
              <h3 className="font-semibold text-foreground">Available Times</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(selectedDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {timesForSelection.map(slot => (
                <div
                  key={slot.id}
                  className="p-3 border border-input rounded-lg hover:border-primary hover:bg-primary/5 transition-all space-y-3"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm">
                      {new Date(`1970-01-01T${slot.start_time}`).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {slot.duration}h • {Number(slot.hourly_rate) === 0 ? 'Free' : `$${Number(slot.hourly_rate) * Number(slot.duration)}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleBooking(slot)}
                    className="w-full"
                  >
                    Book
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-1 h-8"
                      onClick={() => navigate(`/openings/${slot.id}`)}
                      title="View details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-1 h-8"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/openings/${slot.id}`);
                        setCopiedSlotId(slot.id);
                        toast.success('Link copied!');
                        setTimeout(() => setCopiedSlotId(null), 1000);
                      }}
                      title="Copy share link"
                    >
                      {copiedSlotId === slot.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
              <div className="flex justify-between">
                <span className="text-sm font-medium">Price:</span>
                <span className="text-sm font-medium">
                  {Number(selectedSlot.hourly_rate) === 0 ? 'Free' : `$${Number(selectedSlot.hourly_rate) * Number(selectedSlot.duration)}`}
                </span>
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