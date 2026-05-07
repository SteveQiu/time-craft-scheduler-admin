import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { SignInDialog } from '@/components/SignInDialog';
import { ArrowLeft, Calendar, Clock, User, MapPin, Share2, Check, Loader2 } from 'lucide-react';
import { DATE_FORMATS, LOCALE } from '@/config/formats';
import { parseLocation, formatLocation } from '@/lib/address';
import { toast } from 'sonner';

const PENDING_BOOKING_KEY = 'pending_booking_opening_id';

export function OpeningView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-show booking dialog after sign-in (survives OAuth redirect)
  useEffect(() => {
    if (user) {
      const pendingId = localStorage.getItem(PENDING_BOOKING_KEY);
      if (pendingId && pendingId === id) {
        localStorage.removeItem(PENDING_BOOKING_KEY);
        setShowSignIn(false);
        setShowBookingDialog(true);
      }
    }
  }, [user, id]);

  const handleBookClick = () => {
    if (!user) {
      localStorage.setItem(PENDING_BOOKING_KEY, id!);
      setShowSignIn(true);
    } else {
      setShowBookingDialog(true);
    }
  };

  const { data: opening, isLoading, error } = useQuery({
    queryKey: ['opening', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('openings')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;

      // Fetch provider profile and pending count in parallel
      const [profileRes, pendingRes] = await Promise.all([
        supabase.rpc('get_public_profile_by_id', { profile_id: data.user_id }),
        supabase.from('appointments').select('id', { count: 'exact', head: true })
          .eq('opening_id', id!)
          .eq('status', 'pending'),
      ]);

      const profile = profileRes.data?.[0];
      const pendingCount = pendingRes.count || 0;

      return {
        ...data,
        provider_name: profile?.full_name || null,
        provider_slug: profile?.slug || null,
        provider_avatar: profile?.avatar_url || null,
        pending_count: pendingCount,
      };
    },
    enabled: !!id,
  });

  const handleShare = async () => {
    const url = `${window.location.origin}/openings/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const confirmBooking = async () => {
    if (!opening || !user) return;
    setIsBooking(true);
    try {
      const { data, error } = await supabase.rpc('book_opening', {
        _opening_id: opening.id,
        _user_id: user.id,
      });
      if (error) throw error;

      setShowBookingDialog(false);
      queryClient.invalidateQueries({ queryKey: ['opening', id] });
      queryClient.invalidateQueries({ queryKey: ['browse-openings'] });
      toast.success('Appointment booked successfully!');
    } catch (error: any) {
      console.error('Booking failed:', error);
      toast.error(error.message || 'Failed to book appointment');
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !opening) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Opening not found or no longer available.</p>
            <Button onClick={() => navigate('/browse')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Browse Openings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = new Date(opening.date).toLocaleDateString(LOCALE, DATE_FORMATS.long);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={handleShare}>
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Share2 className="h-4 w-4 mr-2" />}
          {copied ? 'Copied!' : 'Share Link'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2">
          <Card className="shadow-soft border-card-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Opening Details</CardTitle>
                <Badge variant={
                  !opening.is_available ? 'secondary' :
                  opening.pending_count > 0 ? 'outline' : 'default'
                } className={opening.pending_count > 0 && opening.is_available ? 'border-yellow-500 text-yellow-700 dark:text-yellow-400' : ''}>
                  {!opening.is_available ? 'Booked' : opening.pending_count > 0 ? `Pending (${opening.pending_count})` : 'Available'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Service</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Service Type</p>
                    <p className="font-medium text-foreground">{opening.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Worker</p>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-foreground">{opening.worker}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{opening.duration} hour{opening.duration > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rate</p>
                    <p className="font-medium text-foreground">
                      {Number(opening.hourly_rate) === 0
                        ? 'Free'
                        : `$${Number(opening.hourly_rate)}/hr · Total: $${Number(opening.hourly_rate) * Number(opening.duration)}`}
                    </p>
                  </div>
                  {opening.location && (
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-foreground">{formatLocation(parseLocation(opening.location))}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Schedule</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-foreground">{formattedDate}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium text-foreground">{opening.start_time} – {opening.end_time}</p>
                  </div>
                </div>
              </div>

              {/* Book Button */}
              {opening.is_available && opening.pending_count === 0 && (
                <div className="pt-4">
                  <Button className="w-full" size="lg" onClick={handleBookClick}>
                    Book This Appointment
                  </Button>
                </div>
              )}

              {opening.is_available && opening.pending_count > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                  <p className="text-yellow-700 dark:text-yellow-400">This opening has pending booking requests and is not available for new bookings.</p>
                </div>
              )}

              {!opening.is_available && (
                <div className="p-4 bg-secondary rounded-lg text-center">
                  <p className="text-muted-foreground">This opening has already been booked.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Provider Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-soft border-card-border">
            <CardHeader>
              <CardTitle className="text-lg">Provider</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => navigate(`/profile/${opening.provider_slug || opening.user_id}`)}
                >
                  {opening.worker.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p
                    className="font-semibold text-foreground cursor-pointer hover:underline"
                    onClick={() => navigate(`/profile/${opening.provider_slug || opening.user_id}`)}
                  >
                    {opening.provider_name || 'Provider'}
                  </p>
                  <p className="text-sm text-muted-foreground">{opening.worker}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/profile/${opening.provider_slug || opening.user_id}`)}
              >
                View Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Confirmation Dialog */}
      <AlertDialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm your appointment booking details:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Worker:</span>
              <span className="text-sm">{opening.worker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Service:</span>
              <span className="text-sm">{opening.service}</span>
            </div>
            {opening.location && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Location:</span>
                <span className="text-sm">{formatLocation(parseLocation(opening.location))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm font-medium">Date:</span>
              <span className="text-sm">{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Time:</span>
              <span className="text-sm">{opening.start_time} – {opening.end_time} ({opening.duration}min)</span>
            </div>
          </div>
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

      <SignInDialog open={showSignIn} onOpenChange={(open) => {
        setShowSignIn(open);
        if (!open) localStorage.removeItem(PENDING_BOOKING_KEY);
      }} />
    </div>
  );
}
