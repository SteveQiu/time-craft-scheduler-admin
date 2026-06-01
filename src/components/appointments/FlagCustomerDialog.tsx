import React, { useEffect, useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface FlagCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  customerId: string;
  appointmentId?: string;
  onFlag: (userId: string, reason: string, notes: string, appointmentId?: string) => Promise<void>;
}

const reasonOptions = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate_language', label: 'Inappropriate Language' },
  { value: 'property_damage', label: 'Property Damage' },
  { value: 'threats', label: 'Threats / Threatening Behaviour' },
  { value: 'no_show_repeated', label: 'Repeated No-Shows' },
  { value: 'other', label: 'Other' },
] as const;

export function FlagCustomerDialog({
  open,
  onOpenChange,
  customerName,
  customerId,
  appointmentId,
  onFlag,
}: FlagCustomerDialogProps) {
  const [reason, setReason] = useState<string>('other');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('other');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [open, customerId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onFlag(customerId, reason, notes, appointmentId);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-500" />
              Flag Customer
            </DialogTitle>
            <DialogDescription>
              Flag {customerName || 'this customer'} for improper behaviour across provider interactions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <Textarea
              placeholder="Additional details (optional)"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Flagging...</> : 'Flag Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
