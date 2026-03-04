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
import { Plus, Trash2, MapPin, CreditCard, Star, Edit } from 'lucide-react';

interface WorkplaceAddress {
  id: string;
  user_id: string;
  label: string;
  address: string;
  is_default: boolean;
  created_at: string;
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
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' },
];

export default function Settings() {
  const { user, signOut } = useAuth();
  const { roles, loading } = useUserRoles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<WorkplaceAddress | null>(null);
  const [addressForm, setAddressForm] = useState({ label: '', address: '' });

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentForm, setPaymentForm] = useState({ label: '', type: 'cash', details: '' });

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
      if (editingAddress) {
        const { error } = await supabase
          .from('workplace_addresses')
          .update({ label: addressForm.label, address: addressForm.address })
          .eq('id', editingAddress.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workplace_addresses')
          .insert({ user_id: user.id, label: addressForm.label, address: addressForm.address });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workplace-addresses'] });
      setShowAddressDialog(false);
      setEditingAddress(null);
      setAddressForm({ label: '', address: '' });
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
      toast({ title: editingPayment ? 'Payment method updated' : 'Payment method added' });
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
      toast({ title: 'Payment method removed' });
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

  const openEditAddress = (addr: WorkplaceAddress) => {
    setEditingAddress(addr);
    setAddressForm({ label: addr.label, address: addr.address });
    setShowAddressDialog(true);
  };

  const openEditPayment = (pm: PaymentMethod) => {
    setEditingPayment(pm);
    setPaymentForm({ label: pm.label, type: pm.type, details: pm.details || '' });
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

      <Tabs defaultValue="addresses">
        <TabsList>
          <TabsTrigger value="addresses">
            <MapPin className="h-4 w-4 mr-2" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Methods
          </TabsTrigger>
        </TabsList>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingAddress(null); setAddressForm({ label: '', address: '' }); setShowAddressDialog(true); }}>
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
                        <p className="text-sm text-muted-foreground">{addr.address}</p>
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
            <Button onClick={() => { setEditingPayment(null); setPaymentForm({ label: '', type: 'cash', details: '' }); setShowPaymentDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>

          {loadingPayments ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg text-muted-foreground">No payment methods saved</p>
                <p className="text-sm text-muted-foreground">Add payment methods to use when creating openings</p>
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
                        {pm.details && <p className="text-sm text-muted-foreground">{pm.details}</p>}
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
      </Tabs>

      {/* Roles & Account */}
      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Your assigned roles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading roles...</p>
            ) : roles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary">{role}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No roles assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

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
              <Label>Address</Label>
              <Input placeholder="123 Main St, City, State" value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddressDialog(false)}>Cancel</Button>
              <Button onClick={() => saveAddress.mutate()} disabled={!addressForm.label || !addressForm.address || saveAddress.isPending}>
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
            <DialogTitle>{editingPayment ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input placeholder="e.g. Business Visa, Cash on site" value={paymentForm.label} onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={paymentForm.type} onValueChange={(v) => setPaymentForm({ ...paymentForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Details (optional)</Label>
              <Input placeholder="e.g. ending in 4242, account info" value={paymentForm.details} onChange={(e) => setPaymentForm({ ...paymentForm, details: e.target.value })} />
            </div>
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
