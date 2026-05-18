import React from 'react';
import { Plus } from 'lucide-react';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { NewOpeningForm } from './types';
import { PaymentMethodType } from '@/lib/payment/types';

interface OpeningPaymentSectionProps {
  newOpening: NewOpeningForm;
  setNewOpening: React.Dispatch<React.SetStateAction<NewOpeningForm>>;
  providerPaymentMethods: { id: string; label: string; type: string }[];
  setShowPaymentDialog: (show: boolean) => void;
  setPaymentFormLabel: (label: string) => void;
  setPaymentFormType: (type: string) => void;
  resetPaymentDetails: () => void;
}

export function OpeningPaymentSection({
  newOpening,
  setNewOpening,
  providerPaymentMethods,
  setShowPaymentDialog,
  setPaymentFormLabel,
  setPaymentFormType,
  resetPaymentDetails,
}: OpeningPaymentSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Accepted Payment Methods</Label>
        <span className="text-xs text-muted-foreground">
          {newOpening.acceptedPaymentMethodIds.length}/{providerPaymentMethods.length} selected
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Customer will choose from these methods when paying</p>
      <div className="flex gap-2 mb-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setNewOpening(prev => ({ ...prev, acceptedPaymentMethodIds: providerPaymentMethods.map(pm => pm.id) }))}
        >
          Select All
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => setNewOpening(prev => ({ ...prev, acceptedPaymentMethodIds: [] }))}
        >
          Deselect All
        </Button>
      </div>
      <div className="space-y-2">
        {providerPaymentMethods.map((pm) => (
          <div key={pm.id} className="flex items-center space-x-2">
            <Checkbox
              id={`pm-new-${pm.id}`}
              checked={newOpening.acceptedPaymentMethodIds.includes(pm.id)}
              onCheckedChange={(checked) => {
                setNewOpening(prev => ({
                  ...prev,
                  acceptedPaymentMethodIds: checked
                    ? [...prev.acceptedPaymentMethodIds, pm.id]
                    : prev.acceptedPaymentMethodIds.filter(id => id !== pm.id),
                }));
              }}
            />
            <label htmlFor={`pm-new-${pm.id}`} className="text-sm cursor-pointer">
              {pm.label} <span className="text-muted-foreground">({pm.type})</span>
            </label>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPaymentFormLabel('');
            setPaymentFormType(PaymentMethodType.Cash);
            resetPaymentDetails();
            setShowPaymentDialog(true);
          }}
        >
          <Plus className="h-3 w-3 mr-1" /> Add Payment Acceptance Method
        </Button>
      </div>
    </div>
  );
}
