import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Check, Zap, Code2 } from 'lucide-react';
import { PremiumUpgrade } from '@/components/PremiumUpgrade';
import { ROUTES } from '@/config/routes';

export function SubscriptionTab() {
  const { user } = useAuth();
  const { isPremium, status, planType, expiresAt, loading: loadingSubscription } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const premiumBenefits = [
    'Premium badge on your provider listing',
    'Up to 100 profile photos (free plan: 3)',
    'Booker attendance stats — see reliability rates per client',
    'Flag unreliable bookers to track no-shows',
    'Confirmation & denial emails sent to bookers on every booking',
    'Multi-day openings with end date extended up to 1 year (free: 1 month)',
    'Automatic Schedule — recreates missing slots when you sign in and keeps availability filled up to one month ahead',
    'Custom Inquiry — let customers contact you directly through your store page',
    'Active Listing — open your store for direct contact requests (email, phone, social links)',
    'Active Listing — listed in the browse page for everyday advertisement',
    'Priority support',
    'Scheduler API — 2,000 requests/day to book & manage appointments programmatically',
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
    } else {
      window.location.href = `mailto:pikappoint@gmail.com?subject=Cancel%20Subscription&body=Hi%2C%20I%20would%20like%20to%20cancel%20my%20PikAppoint%20premium%20subscription.%0A%0AAccount%20email%3A%20${encodeURIComponent(user?.email ?? '')}`;
    }
    setShowCancelDialog(false);
  };

  if (isPremium) {
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
              {expiresAt && (
                <p>
                  {status === 'cancelled' ? 'Access ends' : 'Renews'}:{' '}
                  <span className="font-medium">
                    {new Date(expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </p>
              )}
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
            <div className="flex items-start gap-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-100/50 dark:bg-green-900/30 p-3">
              <Code2 className="h-4 w-4 mt-0.5 text-green-700 dark:text-green-300 shrink-0" />
              <div className="text-sm text-green-700 dark:text-green-300">
                <span className="font-medium">Scheduler API is active.</span>{' '}
                2,000 requests/day — book and manage appointments from your own app.{' '}
                <Link to={ROUTES.apiDoc} className="underline hover:no-underline font-medium">View API docs →</Link>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                To cancel, open the billing email from LemonSqueezy and click <span className="font-medium">Manage Subscription</span>.
              </p>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive border-destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                Email to Cancel Subscription
              </Button>
            </div>
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
          <Zap className="h-5 w-5 text-yellow-500" />
          Upgrade to Premium
        </CardTitle>
        <CardDescription>Unlock all premium features and grow your business.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Premium Features</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {premiumBenefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-green-500" />
                {benefit}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 rounded-lg border p-3 mt-3">
            <Code2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Scheduler API</span> — integrate appointment booking directly into your own app or website.{' '}
              <Link to={ROUTES.apiDoc} className="text-primary hover:underline">View API docs →</Link>
            </div>
          </div>
        </div>
        {user && <PremiumUpgrade orgId={user.id} />}
      </CardContent>
    </Card>
  );
}
