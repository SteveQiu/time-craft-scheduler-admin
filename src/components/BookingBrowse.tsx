import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Calendar as CalendarIcon, Clock, User, MapPin, Search, Filter, Loader2, Share2, ExternalLink, ChevronRight, ArrowLeft, Check, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { BrowseDetail } from './BrowseDetail';

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
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'bookmarks'>('all');

  const today = new Date().toISOString().split('T')[0];

  // Fetch all openings (works for both authenticated and anonymous users)
  const { 
    data: allOpenings = [], 
    isLoading: openingsLoading,
    isError: openingsError,
    error: queryError 
  } = useQuery({
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

      // Filter out openings that have confirmed appointments (not pending)
      const openingIds = (data || []).map((o: any) => o.id);
      let confirmedSet = new Set<string>();
      if (openingIds.length > 0) {
        const { data: confirmedAppts } = await supabase
          .from('appointments')
          .select('opening_id')
          .in('opening_id', openingIds)
          .eq('status', 'confirmed');  // ← Only filter confirmed, not pending
        confirmedSet = new Set((confirmedAppts || []).map((a: any) => a.opening_id));
      }

      const availableData = (data || []).filter((o: any) => !confirmedSet.has(o.id));  // ← Use confirmed, not pending

      // Fetch provider names via RPC (safe, only returns public fields)
      const providerIds = [...new Set(availableData.map((o: any) => o.user_id))];
      let nameMap = new Map<string, string>();
      let slugMap = new Map<string, string>();
      if (providerIds.length > 0) {
        const { data: profiles, error: rpcError } = await supabase
          .rpc('get_public_profile_names', { profile_ids: providerIds });
        
        if (rpcError) {
          console.error('RPC error fetching profiles:', rpcError);
        } else if (profiles) {
          nameMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));
          slugMap = new Map((profiles || []).filter((p: any) => p.slug).map((p: any) => [p.id, p.slug]));
        }
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
        provider_name: nameMap.get(opening.user_id) || 'Organization',
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

  // Fetch bookmarks with provider details
  const { data: bookmarkedProviders = [] } = useQuery({
    queryKey: ['bookmarks-with-details', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const { data: bookmarks, error: bookmarksError } = await supabase
          .from('bookmarks')
          .select('bookmarked_user_id')
          .eq('user_id', user!.id);
        
        if (bookmarksError) {
          console.error('Bookmarks fetch error:', bookmarksError);
          throw bookmarksError;
        }
        
        if (!bookmarks || bookmarks.length === 0) {
          console.log('No bookmarks found');
          return [];
        }
        
        console.log('Bookmarks found:', bookmarks);
        
        const bookmarkedIds = bookmarks.map((b: any) => b.bookmarked_user_id);
        
        // Get provider details for bookmarked users via PII-safe RPC
        const { data: profiles, error: profilesError } = await supabase
          .rpc('get_public_profile_names', { profile_ids: bookmarkedIds });
        
        if (profilesError) {
          console.error('Profiles fetch error:', profilesError);
          throw profilesError;
        }
        
        console.log('Bookmarked profiles:', profiles);
        
        if (!profiles) return [];
        
        // Map to ProviderAccount format
        return profiles.map((profile: any) => ({
          user_id: profile.id,
          provider_name: profile.full_name || 'Unknown',
          provider_slug: profile.slug || null,
          opening_count: allOpenings.filter((o: any) => o.user_id === profile.id).length,
          services: allOpenings
            .filter((o: any) => o.user_id === profile.id)
            .reduce((acc: string[], o: any) => {
              if (!acc.includes(o.service)) acc.push(o.service);
              return acc;
            }, []),
          workers: allOpenings
            .filter((o: any) => o.user_id === profile.id)
            .reduce((acc: string[], o: any) => {
              if (!acc.includes(o.worker)) acc.push(o.worker);
              return acc;
            }, []),
        }));
      } catch (err) {
        console.error('Bookmarks query error:', err);
        return [];
      }
    },
  });

  // Get openings for selected provider
  const selectedProviderOpenings = providerId 
    ? allOpenings.filter(o => o.user_id === providerId)
    : [];

  // Filter providers by search term and exclude current user (can't book own provider)
  const filteredProviders = providers.filter(provider =>
    provider.user_id !== user?.id && (
      searchTerm === '' ||
      provider.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.services.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      provider.workers.some(w => w.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  const handleBooking = (slot: OpeningWithProfile) => {
    if (!user) {
      // Save booking intent and redirect to auth
      try {
        localStorage.setItem('pendingBookingOpeningId', slot.id);
      } catch {}
      toast.info('Please sign in to book this appointment.');
      navigate(`/auth?redirect=/browse/${slot.user_id}`);
      return;
    }
    setSelectedSlot(slot);
    setShowBookingDialog(true);
  };

  const confirmBooking = async () => {
    if (!selectedSlot || !user) return;
    setIsBooking(true);
    try {
      // Use RPC function for atomic booking with immediate opening lock
      const { data: appointmentId, error } = await supabase
        .rpc('book_opening', {
          _opening_id: selectedSlot.id,
          _user_id: user.id
        });

      if (error) throw error;

      // Send confirmation email
      try {
        await supabase.functions.invoke('reminder-smtp', {
          body: {
            to: user.email,
            subject: `Your Appointment is Confirmed! 📅`,
            html: `
              <h2>Booking Confirmed</h2>
              <p>Your appointment has been successfully booked!</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Service:</strong> ${selectedSlot.service || 'N/A'}</p>
                <p><strong>Provider:</strong> ${selectedSlot.provider_name || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(selectedSlot.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${selectedSlot.start_time || 'N/A'}</p>
                <p><strong>Duration:</strong> ${selectedSlot.duration || 'N/A'} hour(s)</p>
                ${selectedSlot.location ? `<p><strong>Location:</strong> ${selectedSlot.location}</p>` : ''}
              </div>
              <p>Thank you for booking with us!</p>
            `,
            text: `Your appointment on ${selectedSlot.date} at ${selectedSlot.start_time} is confirmed.`
          }
        });
      } catch (emailError) {
        console.warn('Email notification failed but booking succeeded:', emailError);
      }

      setShowBookingDialog(false);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
      toast.success('Appointment booked!');
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Failed to book appointment. Please try again.');
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

  if (openingsError) {
    return (
      <div className="p-6">
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Error loading providers</h3>
            <p className="text-muted-foreground mb-4">
              {queryError instanceof Error ? queryError.message : 'Something went wrong'}
            </p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If provider detail view, render BrowseDetail component
  if (providerId) {
    return <BrowseDetail allOpenings={allOpenings} providers={providers} />;
  }

  // Provider List View
  return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-foreground">Browse & Book</h2>
          <div className="text-sm text-muted-foreground">
            {providers.length} provider{providers.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Sign-in CTA for anonymous users */}
        {!user && (
          <Card className="shadow-soft border-card-border bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <p className="text-sm text-foreground">
                Sign in to bookmark providers and book appointments.
              </p>
              <Button onClick={() => navigate('/auth?redirect=/browse')}>
                Sign in
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tab buttons (bookmarks only available when signed in) */}
        {user && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              onClick={() => setViewMode('all')}
              className="flex items-center gap-2"
            >
              All
            </Button>
            <Button
              variant={viewMode === 'bookmarks' ? 'default' : 'outline'}
              onClick={() => setViewMode('bookmarks')}
              className="flex items-center gap-2"
            >
              <Bookmark className="h-4 w-4 text-muted-foreground" />
              Bookmarks ({bookmarkedProviders.length})
            </Button>
          </div>
        )}

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

        {/* Bookmarks View */}
        {viewMode === 'bookmarks' && (
          <>
            {bookmarkedProviders.length === 0 ? (
              <Card className="shadow-soft border-card-border">
                <CardContent className="text-center py-12">
                  <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No bookmarks yet</h3>
                  <p className="text-muted-foreground mb-4">Click the bookmark icon on any provider to save them.</p>
                  <Button variant="outline" onClick={() => setViewMode('all')}>Browse All</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookmarkedProviders.map((provider) => (
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
          </>
        )}

        {/* All View */}
        {viewMode === 'all' && (
          <>
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
          </>
        )}
      </div>
    );
}
