import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, CreditCard, Star, Lock, Shield, Zap } from 'lucide-react';
import { PrivacySettings } from '@/components/Privacy';
import { AddressesTab } from './settings/AddressesTab';
import { PaymentMethodsTab } from './settings/PaymentMethodsTab';
import { PasswordTab } from './settings/PasswordTab';
import { LocationTab } from './settings/LocationTab';
import { SubscriptionTab } from './settings/SubscriptionTab';

export default function Settings() {
  const { user } = useAuth();
  const { roles, loading } = useUserRoles();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'addresses';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please sign in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Settings</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex-col sm:flex-row h-auto w-full sm:w-auto sm:inline-flex">
          <TabsTrigger value="addresses" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="location" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Location
          </TabsTrigger>
          <TabsTrigger value="payments" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Payment Acceptance
          </TabsTrigger>
          <TabsTrigger value="security" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Lock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="roles" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="subscription" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="privacy" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="addresses" className="space-y-4">
          <AddressesTab />
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <LocationTab />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentMethodsTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <PasswordTab />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading roles...</p>
          ) : roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <Badge key={role} variant="secondary" className="text-sm px-3 py-1">{role}</Badge>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">No roles assigned</p>
                <p className="text-sm text-muted-foreground">Your assigned roles in the system will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <SubscriptionTab />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
