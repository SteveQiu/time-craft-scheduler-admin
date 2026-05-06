import { useState } from 'react';
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
import { Plus, Trash2, MapPin, CreditCard, Star, Edit, Lock, Shield } from 'lucide-react';
import { PrivacySettings } from '@/components/Privacy';

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

interface PaymentMethod {
  id: string;
  user_id: string;
  label: string;
  type: string;
  details: string | null;
  is_default: boolean;
  created_at: string;
}

const PAYMENT_TYPES = [
  { value: 'cash', label: 'Cash' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'email_transfer', label: 'Email Transfer' },
  { value: 'wechat', label: 'WeChat' },
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const { roles, loading } = useUserRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<WorkplaceAddress | null>(null);
  const [addressForm, setAddressForm] = useState<{ label: string } & AddressFields>({ label: '', ...EMPTY_ADDRESS_FIELDS });

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentForm, setPaymentForm] = useState({ label: '', type: 'cash', details: '' });
  const [venmoInputType, setVenmoInputType] = useState<'username' | 'phone' | 'qr'>('username');

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
      return data as PaymentMethod[];
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
      if (editingPayment) {
        const { error } = await supabase
          .from('payment_methods')
          .update({ label: paymentForm.label, type: paymentForm.type, details: paymentForm.details || null })
          .eq('id', editingPayment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({ user_id: user.id, label: paymentForm.label, type: paymentForm.type, details: paymentForm.details || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      setShowPaymentDialog(false);
      setEditingPayment(null);
      setPaymentForm({ label: '', type: 'cash', details: '' });
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

  const openEditPayment = (pm: PaymentMethod) => {
    setEditingPayment(pm);
    setPaymentForm({ label: pm.label, type: pm.type, details: pm.details || '' });
    if (pm.type === 'venmo') {
      const d = pm.details || '';
      if (d.startsWith('data:image')) {
        setVenmoInputType('qr');
      } else if (/^[+\d\s\-().]+$/.test(d) && d.length > 0) {
        setVenmoInputType('phone');
      } else {
        setVenmoInputType('username');
      }
    } else {
      setVenmoInputType('username');
    }
    setShowPaymentDialog(true);
  };

  const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE) {
      toast({ title: 'Image too large', description: 'Please upload an image under 1 MB.', variant: 'destructive' });
      e.target.value = '';
      return;
    }

    const compressImage = (dataUrl: string): Promise<string> =>
      new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 800;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = dataUrl;
      });

    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string);
      setPaymentForm(prev => ({ ...prev, details: compressed }));
    };
    reader.readAsDataURL(file);
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

      <Tabs defaultValue="addresses">
        <TabsList className="flex-col sm:flex-row h-auto w-full sm:w-auto sm:inline-flex">
          <TabsTrigger value="addresses" className="w-full sm:w-auto justify-start sm:justify-center text-xs sm:text-sm px-2 sm:px-3 py-2">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Addresses
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

        {/* Payment Methods Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPayment(null); setPaymentForm({ label: '', type: 'cash', details: '' }); setVenmoInputType('username'); setShowPaymentDialog(true); }}>
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
                <Card key={pm.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{pm.label}</h3>
                          <Badge variant="outline">{PAYMENT_TYPES.find(t => t.value === pm.type)?.label || pm.type}</Badge>
                          {pm.is_default && <Badge variant="secondary">Default</Badge>}
                        </div>
                        {pm.details && (
                          (pm.type === 'wechat' || (pm.type === 'venmo' && pm.details.startsWith('data:image')))
                            ? <img src={pm.details} alt="QR Code" className="w-20 h-20 object-contain mt-1 rounded" />
                            : <p className="text-sm text-muted-foreground">{pm.details}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {!pm.is_default && (
                          <Button variant="ghost" size="sm" onClick={() => setDefaultPayment.mutate(pm.id)} title="Set as default">
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEditPayment(pm)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deletePayment.mutate(pm.id)} className="text-destructive hover:text-destructive">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input placeholder="Vancouver" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Province / State</Label>
                <Input placeholder="BC" value={addressForm.province} onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Country</Label>
                <Input placeholder="Canada" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>ZIP / Postal Code</Label>
                <Input placeholder="V6B 1A1" value={addressForm.zip} onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })} />
              </div>
            </div>
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
              <Input placeholder="e.g. My PayPal, Personal Venmo" value={paymentForm.label} onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={paymentForm.type} onValueChange={(v) => { setPaymentForm({ ...paymentForm, type: v, details: '' }); setVenmoInputType('username'); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paymentForm.type === 'cash' && (
              <p className="text-sm text-muted-foreground">No additional details needed for cash payments.</p>
            )}

            {paymentForm.type === 'paypal' && (
              <div className="space-y-2">
                <Label>PayPal Link</Label>
                <Input placeholder="https://paypal.me/yourname" value={paymentForm.details} onChange={(e) => setPaymentForm({ ...paymentForm, details: e.target.value })} />
              </div>
            )}

            {paymentForm.type === 'venmo' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Input Type</Label>
                  <div className="flex gap-2">
                    {(['username', 'phone', 'qr'] as const).map((opt) => (
                      <Button
                        key={opt}
                        type="button"
                        variant={venmoInputType === opt ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setVenmoInputType(opt); setPaymentForm(prev => ({ ...prev, details: '' })); }}
                      >
                        {opt === 'username' ? 'Username' : opt === 'phone' ? 'Phone Number' : 'QR Code'}
                      </Button>
                    ))}
                  </div>
                </div>
                {venmoInputType === 'username' && (
                  <div className="space-y-2">
                    <Label>Venmo Username</Label>
                    <Input placeholder="@username" value={paymentForm.details} onChange={(e) => setPaymentForm({ ...paymentForm, details: e.target.value })} />
                  </div>
                )}
                {venmoInputType === 'phone' && (
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input placeholder="+1 (555) 000-0000" value={paymentForm.details} onChange={(e) => setPaymentForm({ ...paymentForm, details: e.target.value })} />
                  </div>
                )}
                {venmoInputType === 'qr' && (
                  <div className="space-y-2">
                    <Label>QR Code Image</Label>
                    <Input type="file" accept="image/*" onChange={handleQRUpload} />
                    {paymentForm.details && (
                      <img src={paymentForm.details} alt="Venmo QR Preview" className="max-w-[120px] rounded mt-1" />
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentForm.type === 'email_transfer' && (
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input placeholder="payments@example.com" value={paymentForm.details} onChange={(e) => setPaymentForm({ ...paymentForm, details: e.target.value })} />
              </div>
            )}

            {paymentForm.type === 'wechat' && (
              <div className="space-y-2">
                <Label>WeChat QR Code</Label>
                <Input type="file" accept="image/*" onChange={handleQRUpload} />
                {paymentForm.details && (
                  <img src={paymentForm.details} alt="WeChat QR Preview" className="max-w-[120px] rounded mt-1" />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
              <Button onClick={() => savePayment.mutate()} disabled={!paymentForm.label || savePayment.isPending}>
                {savePayment.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
