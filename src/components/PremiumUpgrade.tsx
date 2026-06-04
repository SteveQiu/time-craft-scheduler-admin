import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PremiumUpgradeProps {
  orgId: string | null;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (config: { eventHandler: (event: { event: string; data: unknown }) => void }) => void;
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

export function PremiumUpgrade({ orgId, onSuccess }: PremiumUpgradeProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Subscribe to subscription plan changes
  useEffect(() => {
    let effectOrgId = orgId;
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      if (!effectOrgId) return;

      // Get current plan from subscriptions
      const fetchPlan = async () => {
        const { data } = await (supabase as any)
          .from('subscriptions')
          .select('plan_type, status, expires_at')
          .eq('user_id', effectOrgId)
          .maybeSingle();

        if (data) {
          const premium =
            ['premium', 'pro'].includes(data.plan_type) &&
            data.status === 'active' &&
            (!data.expires_at || new Date(data.expires_at) > new Date());
          setIsPremium(premium);
        }
      };

      await fetchPlan();

      // Subscribe to real-time updates (INSERT for first checkout, UPDATE for changes)
      const channel = supabase
        .channel(`subscription-upgrade-${effectOrgId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${effectOrgId}`,
          },
          (payload) => {
            const row = payload.new as any;
            if (!row) return;
            const premium =
              ['premium', 'pro'].includes(row.plan_type) &&
              row.status === 'active' &&
              (!row.expires_at || new Date(row.expires_at) > new Date());
            if (premium) {
              setIsPremium(true);
              setOpen(false);
              toast.success('✨ Welcome to Premium!');
              onSuccess?.();
            } else {
              setIsPremium(false);
            }
          }
        )
        .subscribe();

      unsubscribe = () => {
        supabase.removeChannel(channel);
      };
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [orgId, onSuccess]);

  const handleCheckout = async () => {
    if (!orgId) {
      toast.error('Organization not found');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { orgId },
      });

      if (error || !data?.url) {
        console.error('create-checkout error:', error, data);
        toast.error('Failed to create checkout. Please try again.');
        return;
      }

      const checkoutUrl: string = data.url + (data.url.includes('?') ? '&' : '?') + 'embed=1';

      if (window.LemonSqueezy) {
        window.LemonSqueezy.Setup({ eventHandler: () => {} });
        window.LemonSqueezy.Url?.Open(checkoutUrl);
      } else {
        window.open(checkoutUrl, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to open payment modal');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirm = () => {
    const portalUrl = import.meta.env.VITE_LEMONSQUEEZY_PORTAL_URL;
    if (portalUrl) {
      window.open(portalUrl, '_blank');
    } else {
      window.location.href = `mailto:pikappoint@gmail.com?subject=Cancel%20Subscription&body=Hi%2C%20I%20would%20like%20to%20cancel%20my%20PikAppoint%20premium%20subscription.%0A%0AAccount%20email%3A%20${encodeURIComponent(user?.email ?? '')}`;
    }
    setShowCancelDialog(false);
  };

  return (
    <>
      {!isPremium && (
        <Button
          onClick={() => setOpen(true)}
          variant="default"
          size="sm"
          className="gap-2"
        >
          <Crown className="h-4 w-4" />
          Go Premium
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              Unlock advanced booking features and analytics for your service business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Premium Features</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Advanced analytics</li>
                <li>✓ Priority support</li>
                <li>✓ Custom branding</li>
                <li>✓ Extended booking history</li>
                <li>✓ Opening end dates up to 3 months out</li>
              </ul>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Opening Payment...' : 'Proceed to Checkout'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to our secure payment processor.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Premium Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll lose access to premium features at end of billing period. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Premium</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
