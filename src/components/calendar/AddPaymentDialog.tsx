import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { PAYMENT_METHOD_CONFIGS, getMethodConfig } from '@/lib/payment/methods';
import { PaymentMethodForm } from '@/components/payment/PaymentMethodForm';
import type { PaymentDetails } from '@/lib/payment/types';

interface AddPaymentDialogProps {
  showPaymentDialog: boolean;
  setShowPaymentDialog: (show: boolean) => void;
  paymentFormLabel: string;
  setPaymentFormLabel: (label: string) => void;
  paymentFormType: string;
  setPaymentFormType: (type: string) => void;
  paymentDetails: PaymentDetails;
  resetPaymentDetails: (newDetails?: PaymentDetails) => void;
  savePaymentFromOpening: { mutate: () => void; isPending: boolean };
}

export function AddPaymentDialog({
  showPaymentDialog,
  setShowPaymentDialog,
  paymentFormLabel,
  setPaymentFormLabel,
  paymentFormType,
  setPaymentFormType,
  paymentDetails,
  resetPaymentDetails,
  savePaymentFromOpening,
}: AddPaymentDialogProps) {
  return (
    <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Payment Acceptance Method</DialogTitle>
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
              onValueChange={(v) => { setPaymentFormType(v); resetPaymentDetails(); }}
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
            return <PaymentMethodForm config={config} value={paymentDetails} onChange={resetPaymentDetails} />;
          })()}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={() => savePaymentFromOpening.mutate()}
              disabled={!paymentFormLabel || savePaymentFromOpening.isPending}
            >
              {savePaymentFromOpening.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
