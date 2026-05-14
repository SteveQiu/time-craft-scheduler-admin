import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgPlan } from '@/hooks/useOrgPlan';
import { PremiumUpgrade } from './PremiumUpgrade';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Crown, Lock } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

/**
 * Example component demonstrating premium feature gating
 * 
 * Usage:
 * 1. Import useOrgPlan and useAuth
 * 2. Check plan status
 * 3. Show premium content or upgrade prompt
 */
export function PremiumFeatureExample() {
  const { user } = useAuth();
  const { plan, loading } = useOrgPlan(user?.id || null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Advanced Analytics
        </CardTitle>
        {plan === 'free' && <PremiumUpgrade orgId={user?.id || null} />}
      </CardHeader>
      <CardContent>
        {plan === 'premium' ? (
          <div>
            {/* Premium feature content */}
            <p className="text-sm text-muted-foreground mb-4">
              Access your detailed analytics dashboard
            </p>
            <div className="space-y-2">
              <div className="p-4 bg-secondary rounded-lg">
                <p className="font-medium">Monthly Revenue</p>
                <p className="text-2xl font-bold">$2,450</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="font-medium">Top Service</p>
                <p className="text-lg">Consulting (+23%)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-muted rounded-full">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                Premium Feature
              </p>
              <p className="text-sm text-muted-foreground">
                Upgrade to Premium to unlock advanced analytics and insights
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
