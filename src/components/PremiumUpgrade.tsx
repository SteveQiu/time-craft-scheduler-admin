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
import { Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PremiumUpgradeProps {
  orgId: string | null;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    LemonSqueezy?: {
      Checkout?: {
        open: (config: { url: string }) => void;
      };
    };
  }
}

export function PremiumUpgrade({ orgId, onSuccess }: PremiumUpgradeProps) {
  const [open, setOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subscribe to org plan changes
  useEffect(() => {
    let effectOrgId = orgId;
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      if (!effectOrgId) return;

      // Get current plan
      const fetchPlan = async () => {
        const { data } = await supabase
          .from('orgs')
          .select('plan')
          .eq('id', effectOrgId)
          .single();

        if (data?.plan === 'premium') {
          setIsPremium(true);
        }
      };

      await fetchPlan();

      // Subscribe to real-time updates
      const channel = supabase
        .channel(`org-${effectOrgId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orgs',
            filter: `id=eq.${effectOrgId}`,
          },
          (payload) => {
            if (payload.new?.plan === 'premium') {
              setIsPremium(true);
              setOpen(false);
              toast.success('✨ Welcome to Premium!');
              onSuccess?.();
            } else if (payload.new?.plan === 'free') {
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

    const storeId = import.meta.env.VITE_LEMON_SQ_STORE_ID;
    const variantId = import.meta.env.VITE_LEMON_SQ_PRODUCT_ID;
    
    if (!storeId || !variantId) {
      toast.error('Premium plan not available. Please try again later.');
      console.error('Lemon Squeezy not configured:', { storeId, variantId });
      return;
    }

    try {
      setLoading(true);
      if (!window.LemonSqueezy?.Checkout?.open) {
        toast.error('Payment system not ready. Please reload the page.');
        return;
      }

      const customData = JSON.stringify({ org_id: orgId });
      const checkoutUrl = `https://${storeId}.lemonsqueezy.com/checkout/buy/${variantId}?checkout[custom][org_id]=${encodeURIComponent(orgId)}`;
      
      window.LemonSqueezy.Checkout.open({ url: checkoutUrl });
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to open payment modal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={isPremium}
        variant={isPremium ? 'outline' : 'default'}
        size="sm"
        className="gap-2"
      >
        <Crown className="h-4 w-4" />
        {isPremium ? 'Premium' : 'Go Premium'}
      </Button>

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
    </>
  );
}
