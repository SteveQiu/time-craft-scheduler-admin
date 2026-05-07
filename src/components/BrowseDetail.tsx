import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Calendar as CalendarIcon, Loader2, Share2, ExternalLink, ArrowLeft, Check, Crown, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocation, parseLocation } from '@/lib/address';
import { TIME_FORMATS, LOCALE } from '@/config/formats';

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

export function BrowseDetail({ 
  allOpenings, 
  providers 
}: { 
  allOpenings: OpeningWithProfile[], 
  providers: ProviderAccount[] 
}) {
  const { providerId } = useParams<{ providerId?: string }>();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [copiedSlotId, setCopiedSlotId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<OpeningWithProfile | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(false);

  // Fetch premium status for provider
  useEffect(() => {
    if (!providerId) return;

    const fetchPremiumStatus = async () => {
      setLoadingPremium(true);
      try {
        const { data } = await (supabase as any).rpc('is_user_premium', { p_user_id: providerId });
        setIsPremium(Boolean(data));
      } catch {
        setIsPremium(false);
      } finally {
        setLoadingPremium(false);
      }
    };

    fetchPremiumStatus();
  }, [providerId]);

  // Get provider
  const currentProvider = providers.find(p => p.user_id === providerId);

  // Get openings for selected provider
  const selectedProviderOpenings = providerId 
    ? allOpenings.filter(o => o.user_id === providerId)
    : [];

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

  // Get times for selected service, worker & date
  const timesForSelection = React.useMemo(() => {
    if (!selectedService || !selectedWorker || !selectedDate) return [];
    return selectedProviderOpenings.filter(
      o => o.service === selectedService && o.worker === selectedWorker && o.date === selectedDate
    );
  }, [selectedService, selectedWorker, selectedDate, selectedProviderOpenings]);

  // Get all available dates
  const allAvailableDates = React.useMemo(() => {
    if (!selectedService) return new Set<string>();
    const openings = serviceMap.get(selectedService) || [];
    
    if (selectedWorker) {
      return new Set(openings.filter(o => o.worker === selectedWorker).map(o => o.date));
    }
    
    return new Set(openings.map(o => o.date));
  }, [selectedService, selectedWorker, serviceMap]);

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const days: (Date | null)[] = [];
    const firstDayOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const startDate = new Date(firstDayOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    return days;
  }, [calendarMonth]);

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCalendarMonth(newMonth);
  };

  if (!currentProvider) {
    return (
      <div className="p-6 flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (selectedProviderOpenings.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/browse')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card className="shadow-soft border-card-border">
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No appointments available</h3>
            <p className="text-muted-foreground">Check back later for new availability.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/browse')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold text-foreground">{currentProvider.provider_name}</h2>
              {isPremium && (
                <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded">
                  <Crown className="h-4 w-4" />
                  <span className="text-xs font-semibold">Premium</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{selectedProviderOpenings.length} available appointments</p>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => navigate(`/profile/${currentProvider.user_id}`)}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          View Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Services</h3>
          {Array.from(serviceMap.keys()).map(service => (
            <Card key={service} className={`cursor-pointer transition-colors ${selectedService === service ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/60 hover:bg-accent/50'}`} onClick={() => { setSelectedService(selectedService === service ? null : service); setSelectedWorker(null); setSelectedDate(null); }}>
              <CardContent className="p-4">
                <span className="font-medium text-sm">{service}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Workers & Calendar */}
        <div>
          {selectedService && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Workers</h3>
              {workersForService.map(worker => (
                <Card key={worker} className={`cursor-pointer transition-colors ${selectedWorker === worker ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-primary/60 hover:bg-accent/50'}`} onClick={() => { setSelectedWorker(selectedWorker === worker ? null : worker); setSelectedDate(null); }}>
                  <CardContent className="p-4">
                    <span className="font-medium text-sm">{worker}</span>
                  </CardContent>
                </Card>
              ))}

              {selectedWorker && (
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => navigateMonth('prev')} className="p-1 hover:bg-accent rounded">←</button>
                    <div className="text-sm font-medium text-center flex-1">{calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                    <button onClick={() => navigateMonth('next')} className="p-1 hover:bg-accent rounded">→</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-xs font-semibold text-center">{day}</div>
                    ))}
                    {calendarDays.map((day, idx) => {
                      const isCurrentMonth = day && day.getMonth() === calendarMonth.getMonth() && day.getFullYear() === calendarMonth.getFullYear();
                      const dateKey = day ? formatDateKey(day) : null;
                      const isAvailable = dateKey ? allAvailableDates.has(dateKey) : false;
                      const isSelected = dateKey === selectedDate;

                      return (
                        <button
                          key={idx}
                          onClick={() => isAvailable && setSelectedDate(dateKey)}
                          disabled={!isAvailable}
                          className={`py-2 text-xs rounded transition-colors ${
                            !isCurrentMonth ? 'text-muted-foreground/30' :
                            !isAvailable ? 'text-muted-foreground/30 cursor-not-allowed line-through' :
                            isSelected ? 'bg-primary text-primary-foreground font-bold' :
                            'bg-accent text-foreground font-semibold border border-primary/30 hover:bg-primary/20 cursor-pointer'
                          }`}
                        >
                          {day?.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Times */}
        {selectedDate && timesForSelection.length > 0 && (
          <Card className="shadow-soft">
            <CardHeader>
              <h3 className="font-semibold text-foreground">Available Times</h3>
              <p className="text-sm text-muted-foreground">{new Date(selectedDate).toLocaleDateString()}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {timesForSelection.map(slot => (
                  <div key={slot.id} className="p-3 border rounded-lg space-y-3">
                    <div>
                      <div className="font-semibold text-sm">{new Date(`1970-01-01T${slot.start_time}`).toLocaleTimeString(LOCALE, TIME_FORMATS.time24)}</div>
                      <div className="text-xs text-muted-foreground">{slot.duration}h</div>
                    </div>
                    <Button size="sm" onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        try { localStorage.setItem('pendingBookingOpeningId', slot.id); } catch {}
                        toast.info('Please sign in to book this appointment.');
                        navigate(`/auth?redirect=/browse/${slot.user_id}`);
                        return;
                      }
                      setSelectedSlot(slot);
                      setShowBookingDialog(true);
                    }} className="w-full">Book</Button>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" className="flex-1 h-8" onClick={() => window.open(`/openings/${slot.id}`)}><ExternalLink className="h-4 w-4" /></Button>
                      <Button variant="outline" size="icon" className="flex-1 h-8" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/openings/${slot.id}`); setCopiedSlotId(slot.id); toast.success('Link copied!'); setTimeout(() => setCopiedSlotId(null), 1000); }}>{copiedSlotId === slot.id ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Booking Confirmation Dialog */}
      <AlertDialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSlot && (
                <div className="space-y-2 mt-2">
                  <div><strong>Service:</strong> {selectedSlot.service}</div>
                  <div><strong>Worker:</strong> {selectedSlot.worker}</div>
                  <div><strong>Date:</strong> {new Date(selectedSlot.date).toLocaleDateString()}</div>
                  <div><strong>Time:</strong> {selectedSlot.start_time} - {selectedSlot.end_time}</div>
                  <div><strong>Duration:</strong> {selectedSlot.duration}h</div>
                  <div><strong>Rate:</strong> ${selectedSlot.hourly_rate}/h</div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Cancel
            </Button>
            <AlertDialogAction 
              onClick={async () => {
                if (!selectedSlot) return;
                setIsBooking(true);
                try {
                  // Get current user with proper error handling
                  const { data: { user }, error: userError } = await supabase.auth.getUser();
                  if (!user || userError) {
                    throw new Error('Please log in to book an appointment');
                  }
                  
                  // Call the book_opening RPC function
                  const { data, error } = await supabase.rpc('book_opening', {
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
                            ${selectedSlot.location ? `<p><strong>Location:</strong> ${formatLocation(parseLocation(selectedSlot.location))}</p>` : ''}
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
                  toast.success('Appointment booked successfully!');
                  
                  // Refresh the page to show updated availability
                  setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                  console.error('Booking failed:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to book appointment. Please try again.'; toast.error(errorMessage);
                } finally {
                  setIsBooking(false);
                }
              }}
              disabled={isBooking}
            >
              {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isBooking ? 'Booking...' : 'Confirm Booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


