import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { generateTimeOptions } from './calendarUtils';
import { PaymentMethodType } from '@/lib/payment/types';
import type { Opening, EditOpeningForm } from './types';

interface EditOpeningDialogProps {
  editingOpening: Opening | null;
  setEditingOpening: (opening: Opening | null) => void;
  editForm: EditOpeningForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditOpeningForm>>;
  isEditSaving: boolean;
  saveEditOpening: () => Promise<void>;
  selfResourceName: string;
  getResourceRate: (name: string) => number;
  getResourceSkills: (name: string) => string[];
  providerPaymentMethods: { id: string; label: string; type: string }[];
  setShowPaymentDialog: (show: boolean) => void;
  setPaymentFormLabel: (label: string) => void;
  setPaymentFormType: (type: string) => void;
  resetPaymentDetails: () => void;
}

export function EditOpeningDialog({
  editingOpening,
  setEditingOpening,
  editForm,
  setEditForm,
  isEditSaving,
  saveEditOpening,
  selfResourceName,
  getResourceRate,
  getResourceSkills,
  providerPaymentMethods,
  setShowPaymentDialog,
  setPaymentFormLabel,
  setPaymentFormType,
  resetPaymentDetails,
}: EditOpeningDialogProps) {
  const resourceName = editingOpening?.worker ?? selfResourceName;

  return (
    <Dialog
      open={!!editingOpening}
      onOpenChange={(open) => { if (!open) setEditingOpening(null); }}
    >
      <DialogContent key={editingOpening?.id} className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Opening</DialogTitle>
          {editingOpening && (
            <DialogDescription>
              {editingOpening.date} · {editingOpening.start_time} – {editingOpening.end_time}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Select
              value={editForm.service}
              onValueChange={(v) => setEditForm(prev => ({ ...prev, service: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {getResourceSkills(resourceName).map((skill) => (
                  <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Select
              value={editForm.startTime}
              onValueChange={(v) => setEditForm(prev => ({ ...prev, startTime: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label>End Time</Label>
            <Select
              value={editForm.endTime}
              onValueChange={(v) => setEditForm(prev => ({ ...prev, endTime: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select end time" />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rate */}
          <div className="space-y-2">
            <Label>Rate</Label>
            <Select
              value={editForm.isFree ? 'free' : 'paid'}
              onValueChange={(v) => {
                const isFree = v === 'free';
                if (isFree) {
                  setEditForm(prev => ({ ...prev, isFree: true, total: 0 }));
                } else if (editingOpening) {
                  const dur = Number(editingOpening.duration) || 0;
                  const defaultTotal = Number(getResourceRate(resourceName)) * dur;
                  setEditForm(prev => ({
                    ...prev,
                    isFree: false,
                    total: prev.total > 0 ? prev.total : defaultTotal,
                  }));
                } else {
                  setEditForm(prev => ({ ...prev, isFree: false }));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free ($0)</SelectItem>
                <SelectItem value="paid">Paid (custom total)</SelectItem>
              </SelectContent>
            </Select>

            {!editForm.isFree && editingOpening && (() => {
              const dur = Number(editingOpening.duration) || 0;
              const derivedRate = dur > 0 ? editForm.total / dur : 0;
              return (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Total</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={editForm.total || ''}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        total: parseFloat(e.target.value) || 0,
                      }))}
                      className="w-32 h-9 px-3 py-1 rounded-md border border-input bg-background text-sm"
                    />
                    <span className="text-muted-foreground text-sm">
                      (≈ ${derivedRate.toFixed(2)}/hr · default ${Number(getResourceRate(resourceName))}/hr)
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Accepted Payment Methods */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Accepted Payment Methods</Label>
              <span className="text-xs text-muted-foreground">
                {editForm.acceptedPaymentMethodIds.length}/{providerPaymentMethods.length} selected
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Customer will choose from these methods when paying</p>
            <div className="flex gap-2 mb-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setEditForm(prev => ({ ...prev, acceptedPaymentMethodIds: providerPaymentMethods.map(pm => pm.id) }))}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setEditForm(prev => ({ ...prev, acceptedPaymentMethodIds: [] }))}
              >
                Deselect All
              </Button>
            </div>
            <div className="space-y-2">
              {providerPaymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pm-edit-${pm.id}`}
                    checked={editForm.acceptedPaymentMethodIds.includes(pm.id)}
                    onCheckedChange={(checked) => {
                      setEditForm(prev => ({
                        ...prev,
                        acceptedPaymentMethodIds: checked
                          ? [...prev.acceptedPaymentMethodIds, pm.id]
                          : prev.acceptedPaymentMethodIds.filter(id => id !== pm.id),
                      }));
                    }}
                  />
                  <label htmlFor={`pm-edit-${pm.id}`} className="text-sm cursor-pointer">
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setEditingOpening(null)}>Cancel</Button>
            <Button onClick={saveEditOpening} disabled={isEditSaving}>
              {isEditSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
