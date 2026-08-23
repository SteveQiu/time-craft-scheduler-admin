import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, CreditCard } from 'lucide-react';
import { PAYMENT_METHOD_CONFIGS, getMethodConfig } from '@/lib/payment/methods';
import { deserializeDetailsByType } from '@/lib/payment/serialization';
import { PaymentMethodRecord, PaymentMethodType } from '@/lib/payment/types';
import { usePaymentMethod } from '@/hooks/usePaymentMethod';
import { PaymentMethodForm } from '@/components/payment/PaymentMethodForm';
import { PaymentMethodCard } from '@/components/payment/PaymentMethodCard';

export function PaymentMethodsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethodRecord | null>(null);
  const [paymentFormLabel, setPaymentFormLabel] = useState('');
  const [paymentFormType, setPaymentFormType] = useState<string>(PaymentMethodType.Cash);
  const { details: paymentDetails, reset: resetPaymentDetails, serialize: serializePaymentDetails } = usePaymentMethod();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payment-methods', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PaymentMethodRecord[];
    },
    enabled: !!user,
  });

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
      setShowDialog(false);
      setEditingPayment(null);
      setPaymentFormLabel('');
      setPaymentFormType(PaymentMethodType.Cash);
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

  const openAdd = () => {
    setEditingPayment(null);
    setPaymentFormLabel('');
    setPaymentFormType(PaymentMethodType.Cash);
    resetPaymentDetails();
    setShowDialog(true);
  };

  const openEdit = (pm: PaymentMethodRecord) => {
    setEditingPayment(pm);
    setPaymentFormLabel(pm.label);
    setPaymentFormType(pm.type);
    resetPaymentDetails(deserializeDetailsByType(pm.type, pm.details));
    setShowDialog(true);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Acceptance Method
          </Button>
        </div>

        {isLoading ? (
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
                onEdit={() => openEdit(pm)}
                onDelete={() => deletePayment.mutate(pm.id)}
                onSetDefault={pm.is_default ? undefined : () => setDefaultPayment.mutate(pm.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => savePayment.mutate()} disabled={!paymentFormLabel || savePayment.isPending}>
                {savePayment.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
