import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, CreditCard, Star, Lock, Shield, Edit, Trash2, Zap } from 'lucide-react';
import { PrivacySettings } from '@/components/Privacy';
import { useSubscription } from '@/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';
import { COUNTRIES, PROVINCES_BY_COUNTRY } from '@/lib/address';
import { AddressInput } from '@/components/ui/AddressInput';
import { PAYMENT_METHOD_CONFIGS, getMethodConfig } from '@/lib/payment/methods';
import { deserializeDetailsByType } from '@/lib/payment/serialization';
import { PaymentMethodRecord } from '@/lib/payment/types';
import { usePaymentMethod } from '@/hooks/usePaymentMethod';
import { PaymentMethodForm } from '@/components/payment/PaymentMethodForm';
import { PaymentMethodCard } from '@/components/payment/PaymentMethodCard';

interface WorkplaceAddress {
  id: string;
  user_id: string;
  label: string;
  address: string; // stored as JSON: {street,city,province,country,zip}
  is_default: boolean;
  created_at: string;
}

interface AddressFields {
  street: string;
  city: string;
  province: string;
  country: string;
  zip: string;
}

const EMPTY_ADDRESS_FIELDS: AddressFields = { street: '', city: '', province: '', country: '', zip: '' };

function parseAddress(raw: string): AddressFields {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'street' in parsed) return parsed as AddressFields;
  } catch {}
  return { ...EMPTY_ADDRESS_FIELDS, street: raw };
}

function formatAddressDisplay(raw: string): string {
  const f = parseAddress(raw);
  return [f.street, f.city, f.province, f.country, f.zip].filter(Boolean).join(', ');
}




export default function Settings() {
  const { user, signOut } = useAuth();
  const { roles, loading } = useUserRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPremium, status, planType, loading: loadingSubscription } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'addresses';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  // Address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<WorkplaceAddress | null>(null);
  const [addressForm, setAddressForm] = useState<{ label: string } & AddressFields>({ label: '', ...EMPTY_ADDRESS_FIELDS });

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethodRecord | null>(null);
  const [paymentFormLabel, setPaymentFormLabel] = useState('');
  const [paymentFormType, setPaymentFormType] = useState('cash');
  const { details: paymentDetails, reset: resetPaymentDetails, serialize: serializePaymentDetails } = usePaymentMethod();

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Location preference state
  const [locationPref, setLocationPref] = useState({ province: '', country: '' });
  const [locationPrefSaving, setLocationPrefSaving] = useState(false);

  // Load location preference on mount
  React.useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`locationPreference_${user.id}`);
      if (saved) {
        try {
          setLocationPref(JSON.parse(saved));
        } catch {}
      }
    }
  }, [user?.id]);

  // Fetch addresses
  const { data: addresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: ['workplace-addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplace_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkplaceAddress[];
    },
    enabled: !!user,
  });

  // Fetch payment methods
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentMethodRecord[];
    },
    enabled: !!user,
  });

  // Address mutations
  const saveAddress = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const addressJson = JSON.stringify({ street: addressForm.street, city: addressForm.city, province: addressForm.province, country: addressForm.country, zip: addressForm.zip });
      if (editingAddress) {
        const { error } = await supabase
          .from('workplace_addresses')
          .update({ label: addressForm.label, address: addressJson })
          .eq('id', editingAddress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workplace_addresses')
          .insert({ user_id: user.id, label: addressForm.label, address: addressJson });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workplace-addresses'] });
      setShowAddressDialog(false);
      setEditingAddress(null);
      setAddressForm({ label: '', ...EMPTY_ADDRESS_FIELDS });
      toast({ title: editingAddress ? 'Address updated' : 'Address added' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workplace_addresses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workplace-addresses'] });
      toast({ title: 'Address removed' });
    },
  });

  const setDefaultAddress = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase.from('workplace_addresses').update({ is_default: false }).eq('user_id', user.id);
      const { error } = await supabase.from('workplace_addresses').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workplace-addresses'] }),
  });

  // Payment mutations
  const savePayment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const details = serializePaymentDetails();
      if (editingPayment) {
        const { error } = await supabase
          .from('payment_methods')
          .update({ label: paymentFormLabel, type: paymentFormType, details })
          .eq('id', editingPayment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({ user_id: user.id, label: paymentFormLabel, type: paymentFormType, details });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setShowPaymentDialog(false);
      setEditingPayment(null);
      setPaymentFormLabel('');
      setPaymentFormType('cash');
      resetPaymentDetails();
      toast({ title: editingPayment ? 'Payment acceptance method updated' : 'Payment acceptance method added' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payment_methods').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ title: 'Payment acceptance method removed' });
    },
  });

  const setDefaultPayment = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      await supabase.from('payment_methods').update({ is_default: false }).eq('user_id', user.id);
      const { error } = await supabase.from('payment_methods').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });

  const handleChangePassword = async () => {
    setPasswordChangeError('');

    // Validation
    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Clear form
      setNewPassword('');
      setConfirmPassword('');

      toast({
        title: 'Success!',
        description: 'Your password has been changed.',
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      setPasswordChangeError(error.message || 'Failed to change password');
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const openEditAddress = (addr: WorkplaceAddress) => {
    setEditingAddress(addr);
    const parsed = parseAddress(addr.address);
    setAddressForm({ label: addr.label, ...parsed });
    setShowAddressDialog(true);
  };

  const openEditPayment = (pm: PaymentMethodRecord) => {
    setEditingPayment(pm);
    setPaymentFormLabel(pm.label);
    setPaymentFormType(pm.type);
    resetPaymentDetails(deserializeDetailsByType(pm.type, pm.details));
    setShowPaymentDialog(true);
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

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingAddress(null); setAddressForm({ label: '', ...EMPTY_ADDRESS_FIELDS }); setShowAddressDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </div>

          {loadingAddresses ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : addresses.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">No addresses saved</p>
                <p className="text-sm text-muted-foreground">Add addresses to quickly select them when creating openings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <Card key={addr.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{addr.label}</h3>
                          {addr.is_default && <Badge variant="secondary">Default</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatAddressDisplay(addr.address)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!addr.is_default && (
                          <Button variant="ghost" size="sm" onClick={() => setDefaultAddress.mutate(addr.id)} title="Set as default">
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEditAddress(addr)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteAddress.mutate(addr.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Location Preference Tab */}
        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Your Location Preference
              </CardTitle>
              <CardDescription>Set your preferred location to pre-filter openings in Browse</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={locationPref.country}
                    onValueChange={(country) => {
                      const provinces = PROVINCES_BY_COUNTRY[country] || [];
                      const newProvince = provinces.includes(locationPref.province) ? locationPref.province : '';
                      setLocationPref({ country, province: newProvince });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Province / State</Label>
                  <Select
                    value={locationPref.province}
                    onValueChange={(province) => setLocationPref({ ...locationPref, province })}
                    disabled={!locationPref.country || (PROVINCES_BY_COUNTRY[locationPref.country]?.length ?? 0) === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!locationPref.country ? "Select country first" : "Select province/state"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(PROVINCES_BY_COUNTRY[locationPref.country] || []).map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!user?.id) return;
                    setLocationPrefSaving(true);
                    try {
                      localStorage.setItem(`locationPreference_${user.id}`, JSON.stringify(locationPref));
                      toast({ title: 'Location preference saved' });
                    } catch (error) {
                      toast({ title: 'Failed to save preference', variant: 'destructive' });
                    } finally {
                      setLocationPrefSaving(false);
                    }
                  }}
                  disabled={locationPrefSaving || !locationPref.province || !locationPref.country}
                >
                  {locationPrefSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!user?.id) return;
                    setLocationPref({ province: '', country: '' });
                    try {
                      localStorage.removeItem(`locationPreference_${user.id}`);
                      toast({ title: 'Location preference cleared' });
                    } catch {}
                  }}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPayment(null); setPaymentFormLabel(''); setPaymentFormType('cash'); resetPaymentDetails(); setShowPaymentDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Acceptance Method
            </Button>
          </div>

          {loadingPayments ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">No payment acceptance methods saved</p>
                <p className="text-sm text-muted-foreground">Add payment acceptance methods to use when creating openings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {payments.map((pm) => (
                <PaymentMethodCard
                  key={pm.id}
                  method={pm}
                  onEdit={() => openEditPayment(pm)}
                  onDelete={() => deletePayment.mutate(pm.id)}
                  onSetDefault={pm.is_default ? undefined : () => setDefaultPayment.mutate(pm.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {passwordChangeError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{passwordChangeError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={isChangingPassword}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={isChangingPassword}
                  minLength={6}
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isChangingPassword ? 'Changing password...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Created</p>
                <p className="font-medium">{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
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

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          {loadingSubscription ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ) : isPremium ? (
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
          ) : (
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
          )}
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <PrivacySettings />
        </TabsContent>
      </Tabs>

      {/* Address Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add Address'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input placeholder="e.g. Main Office, Studio A" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Street Address</Label>
              <Input placeholder="123 Main St" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} />
            </div>
            <AddressInput
              value={{ city: addressForm.city, province: addressForm.province, country: addressForm.country, zip: addressForm.zip }}
              onChange={(fields) => setAddressForm({ ...addressForm, ...fields })}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddressDialog(false)}>Cancel</Button>
              <Button onClick={() => saveAddress.mutate()} disabled={!addressForm.label || !addressForm.street || !addressForm.city || saveAddress.isPending}>
                {saveAddress.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Payment Acceptance Method' : 'Add Payment Acceptance Method'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                placeholder="e.g. My PayPal, Personal Venmo"
                value={paymentFormLabel}
                onChange={(e) => setPaymentFormLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={paymentFormType}
                onValueChange={(v) => {
                  setPaymentFormType(v);
                  resetPaymentDetails();
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_CONFIGS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const config = getMethodConfig(paymentFormType);
              if (!config) return null;
              return (
                <PaymentMethodForm
                  config={config}
                  value={paymentDetails}
                  onChange={resetPaymentDetails}
                />
              );
            })()}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button onClick={() => savePayment.mutate()} disabled={!paymentFormLabel || savePayment.isPending}>
                {savePayment.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
