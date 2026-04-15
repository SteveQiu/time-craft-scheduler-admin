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
import { Calendar as CalendarIcon, Clock, User, MapPin, Search, Filter, Loader2, Share2, ExternalLink, ChevronRight, ArrowLeft } from 'lucide-react';
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

      {/* Available Appointments */}
      {selectedProviderOpenings.length === 0 ? (
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No appointments available</h3>
            <p className="text-muted-foreground">Check back later for new availability.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedProviderOpenings.map((slot) => (
            <Card key={slot.id} className="shadow-soft border-card-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => navigate(`/profile/${slot.provider_slug || slot.user_id}`)}
                    >
                      {slot.worker.substring(0, 2).toUpperCase()}
                    </div>
                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/profile/${slot.provider_slug || slot.user_id}`)}
                    >
                      <h3 className="font-semibold text-foreground hover:underline">{slot.worker}</h3>
                      <p className="text-sm text-muted-foreground hover:underline">{slot.provider_name || 'Organization'}</p>
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
                    <span>{slot.duration}h</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    {Number(slot.hourly_rate) === 0
                      ? <Badge variant="secondary">Free</Badge>
                      : <span className="text-primary">${Number(slot.hourly_rate) * Number(slot.duration)}</span>}
                  </div>
                  {slot.location && (
                    <div className="flex items-center space-x-2 col-span-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{slot.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleBooking(slot)}
                    className="flex-1"
                  >
                    Book Appointment
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/openings/${slot.id}`)}
                    title="View details"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/openings/${slot.id}`);
                      toast.success('Link copied!');
                    }}
                    title="Copy share link"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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