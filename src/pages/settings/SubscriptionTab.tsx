import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap } from 'lucide-react';

export function SubscriptionTab() {
  const { user } = useAuth();
  const { isPremium, status, planType, loading: loadingSubscription } = useSubscription();

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

  if (isPremium) {
    return (
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
        <CardContent className="space-y-1 text-sm text-green-700 dark:text-green-300">
          <p>Plan: <span className="font-medium capitalize">{planType}</span></p>
          <p>Status: <span className="font-medium capitalize">{status}</span></p>
        </CardContent>
      </Card>
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
        {import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_URL ? (
          <Button
            onClick={() =>
              window.open(
                `${import.meta.env.VITE_LEMONSQUEEZY_CHECKOUT_URL}?checkout[custom][user_id]=${user?.id}`,
                '_blank'
              )
            }
          >
            <Zap className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        ) : (
          <Button disabled>Upgrade coming soon</Button>
        )}
      </CardContent>
    </Card>
  );
}
