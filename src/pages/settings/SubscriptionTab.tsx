import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Check, Zap } from 'lucide-react';
import { PremiumUpgrade } from '@/components/PremiumUpgrade';

export function SubscriptionTab() {
  const { user } = useAuth();
  const { isPremium, status, planType, loading: loadingSubscription } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const premiumBenefits = [
    'Premium badge on your provider listing',
    'Up to 10 profile photos (free plan: 3)',
    'Booker attendance stats — see reliability rates per client',
    'Flag unreliable bookers to track no-shows',
    'Advanced analytics',
    'Priority support',
  ];

  if (loadingSubscription) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const handleCancelConfirm = () => {
    const portalUrl = import.meta.env.VITE_LEMONSQUEEZY_PORTAL_URL;
    if (portalUrl) {
      window.open(portalUrl, '_blank');
    }
    setShowCancelDialog(false);
  };

  if (isPremium) {
    const portalUrl = import.meta.env.VITE_LEMONSQUEEZY_PORTAL_URL;
    
    return (
      <>
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Zap className="h-5 w-5" />
              Premium Active
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              You have full access to all premium features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
              <p>Plan: <span className="font-medium capitalize">{planType}</span></p>
              <p>Status: <span className="font-medium capitalize">{status}</span></p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Your premium features:</p>
              <ul className="space-y-1 text-sm text-green-600 dark:text-green-400">
                {premiumBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              disabled={!portalUrl}
            >
              {portalUrl ? 'Cancel Subscription' : 'Cancellation portal coming soon — contact support@pikappoint.com'}
            </Button>
          </CardContent>
        </Card>

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Premium Subscription?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll lose access to premium features at the end of your current billing period. Your account will revert to the free plan. No refunds will be issued for unused time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Premium</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelConfirm}>
                Yes, cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-muted-foreground" />
          Free Plan
        </CardTitle>
        <CardDescription>Upgrade to Premium for full access.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-foreground">What you'll get:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {premiumBenefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        {user && <PremiumUpgrade orgId={user.id} />}
      </CardContent>
    </Card>
  );
}
