import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AddressInput } from '@/components/ui/AddressInput';
import { Plus } from 'lucide-react';
import {
  generateTimeOptions,
} from './calendarUtils';
import type { NewOpeningForm } from './types';
import type { LocationFields } from '@/lib/address';
import { OpeningTimeSlotsSection } from './OpeningTimeSlotsSection';
import { OpeningDateRangeSection } from './OpeningDateRangeSection';
import { OpeningPaymentSection } from './OpeningPaymentSection';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

function addressMatchesSaved(fields: LocationFields, savedAddresses: any[]): boolean {
  const norm = (s: string) => (s || '').trim().toLowerCase();
  return savedAddresses.some(addr => {
    try {
      const parsed = typeof addr.address === 'string' ? JSON.parse(addr.address) : addr.address;
      return (
        norm(parsed.address_line_1) === norm(fields.address_line_1) &&
        norm(parsed.city) === norm(fields.city) &&
        norm(parsed.country) === norm(fields.country)
      );
    } catch { return false; }
  });
}

function nextCustomAddressLabel(savedAddresses: any[]): string {
  const customNums = savedAddresses
    .map(a => a.label)
    .filter((l: string) => /^Custom Address \d+$/i.test(l))
    .map((l: string) => parseInt(l.replace(/\D/g, ''), 10));
  const max = customNums.length ? Math.max(...customNums) : 0;
  return `Custom Address ${max + 1}`;
}

interface AcceptedResource {
  id: string;
  resource_name: string;
  user_id: string;
}

interface OpeningFormDialogProps {
  showAddOpening: boolean;
  setShowAddOpening: (show: boolean) => void;
  selectedDate: Date;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  newOpening: NewOpeningForm;
  setNewOpening: React.Dispatch<React.SetStateAction<NewOpeningForm>>;
  loading: boolean;
  user: { id: string } | null | undefined;
  isPremium: boolean;
  acceptedResources: AcceptedResource[];
  selfResourceName: string;
  getResourceSkills: (name: string) => string[];
  getResourceRate: (name: string) => number;
  savedAddresses: any[];
  providerPaymentMethods: { id: string; label: string; type: string }[];
  addOpening: () => Promise<void>;
  setShowPaymentDialog: (show: boolean) => void;
  setPaymentFormLabel: (label: string) => void;
  setPaymentFormType: (type: string) => void;
  resetPaymentDetails: () => void;
  onSaveCustomAddress?: (label: string, fields: LocationFields) => void;
}

export function OpeningFormDialog({
  showAddOpening,
  setShowAddOpening,
  selectedDate,
  errors,
  setErrors,
  newOpening,
  setNewOpening,
  loading,
  user,
  isPremium,
  acceptedResources,
  selfResourceName,
  getResourceSkills,
  getResourceRate,
  savedAddresses,
  providerPaymentMethods,
  addOpening,
  setShowPaymentDialog,
  setPaymentFormLabel,
  setPaymentFormType,
  resetPaymentDetails,
  onSaveCustomAddress,
}: OpeningFormDialogProps) {
  const resourceNameForRate = newOpening.worker || selfResourceName;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [saveAsCustom, setSaveAsCustom] = React.useState(false);
  const [showAddService, setShowAddService] = React.useState(false);
  const [newServiceInput, setNewServiceInput] = React.useState('');
  const [savingService, setSavingService] = React.useState(false);

  const handleAddService = async () => {
    const trimmed = newServiceInput.trim();
    if (!trimmed || !user) return;
    setSavingService(true);
    try {
      const currentSkills = getResourceSkills(resourceNameForRate);
      if (currentSkills.includes(trimmed)) {
        toast({ title: 'Service already exists', variant: 'destructive' });
        return;
      }
      const { error } = await supabase
        .from('profiles')
        .update({ skills: [...currentSkills, trimmed] } as any)
        .eq('id', user.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['own-profile-for-openings', user.id] });
      setNewOpening({ ...newOpening, service: trimmed });
      setNewServiceInput('');
      setShowAddService(false);
      toast({ title: 'Service added' });
    } catch (err: any) {
      toast({ title: 'Failed to add service', description: err.message, variant: 'destructive' });
    } finally {
      setSavingService(false);
    }
  };

  const isAddressFilled = !!(newOpening.locationFields.address_line_1 && newOpening.locationFields.city && newOpening.locationFields.country);
  const addressAlreadySaved = isAddressFilled && addressMatchesSaved(newOpening.locationFields, savedAddresses);
  const customLabel = nextCustomAddressLabel(savedAddresses);

  return (
    <Dialog open={showAddOpening} onOpenChange={(open) => { setShowAddOpening(open); if (!open) setSaveAsCustom(false); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Opening for {selectedDate.toLocaleDateString()}</DialogTitle>
        </DialogHeader>
        {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
        <div className="space-y-4 pt-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={newOpening.multipleSlots}
              onCheckedChange={(checked) => {
                setNewOpening({ ...newOpening, multipleSlots: checked });
                setErrors(prev => ({ ...prev, endTime: '' }));
              }}
            />
            <Label>Create multiple time slots</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={newOpening.multipleDates}
              onCheckedChange={(checked) => {
                setNewOpening({ ...newOpening, multipleDates: checked });
              }}
            />
            <Label>Create multiple date slots</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <Select
              value={newOpening.startTime}
              onValueChange={(value) => {
                setNewOpening({ ...newOpening, startTime: value });
                setErrors(prev => ({ ...prev, startTime: '' }));
              }}
            >
              <SelectTrigger className={errors.startTime ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions().map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.startTime && <p className="text-sm text-destructive">{errors.startTime}</p>}
          </div>

          <OpeningTimeSlotsSection
            newOpening={newOpening}
            setNewOpening={setNewOpening}
            errors={errors}
            setErrors={setErrors}
          />

          {newOpening.multipleDates && (
            <OpeningDateRangeSection
              newOpening={newOpening}
              setNewOpening={setNewOpening}
              errors={errors}
              setErrors={setErrors}
              isPremium={isPremium}
            />
          )}

          <div className="space-y-2">
              <Label htmlFor="worker">Resource</Label>
              <Select
                value={newOpening.worker}
                onValueChange={(value) => {
                  const skills = getResourceSkills(value);
                  setNewOpening({ ...newOpening, worker: value, service: skills[0] || '' });
                  setErrors(prev => ({ ...prev, worker: '', service: '' }));
                }}
              >
                <SelectTrigger className={errors.worker ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  {acceptedResources.map((w) => (
                    <SelectItem key={w.id} value={w.resource_name}>{w.resource_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.worker && <p className="text-sm text-destructive">{errors.worker}</p>}
            </div>

          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            {!showAddService && (
              <Select
                value={newOpening.service}
                onValueChange={(value) => {
                  if (value === '__add_new__') {
                    setShowAddService(true);
                    return;
                  }
                  setNewOpening({ ...newOpening, service: value });
                  setErrors(prev => ({ ...prev, service: '' }));
                }}
              >
                <SelectTrigger className={errors.service ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {getResourceSkills(resourceNameForRate).map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                  <SelectItem value="__add_new__">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Plus className="h-3 w-3" /> Add Service
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            {showAddService && (
              <div className="flex gap-2">
                <Input
                  value={newServiceInput}
                  onChange={(e) => setNewServiceInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddService(); } }}
                  placeholder="e.g. Haircut, Massage..."
                  autoFocus
                />
                <Button size="sm" onClick={handleAddService} disabled={savingService || !newServiceInput.trim()}>
                  {savingService ? '…' : 'Add'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddService(false); setNewServiceInput(''); }}>
                  Cancel
                </Button>
              </div>
            )}
            {errors.service && <p className="text-sm text-destructive">{errors.service}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            {savedAddresses.length > 0 && (
              <Select
                value=""
                onValueChange={(value) => {
                  if (value !== '__custom__') {
                    try {
                      const addr = JSON.parse(value);
                      setNewOpening({
                        ...newOpening,
                        locationFields: {
                          address_line_1: addr.address_line_1 || addr.street || '',
                          address_line_2: addr.address_line_2 || '',
                          city: addr.city || '',
                          province: addr.province || '',
                          country: addr.country || '',
                          zip: addr.zip || '',
                        },
                      });
                    } catch {}
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use saved address" />
                </SelectTrigger>
                <SelectContent>
                  {savedAddresses.map((addr: any) => (
                    <SelectItem key={addr.id} value={addr.address}>
                      {addr.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">Custom location...</SelectItem>
                </SelectContent>
              </Select>
            )}
            <AddressInput
              value={newOpening.locationFields}
              onChange={(fields) => setNewOpening({ ...newOpening, locationFields: fields })}
              required
            />
            {isAddressFilled && !addressAlreadySaved && (
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id="save-custom-address"
                  checked={saveAsCustom}
                  onCheckedChange={(checked) => setSaveAsCustom(!!checked)}
                />
                <Label htmlFor="save-custom-address" className="text-sm text-muted-foreground cursor-pointer">
                  Save as "{customLabel}"
                </Label>
              </div>
            )}
            {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
          </div>

          {/* Rate Selector */}
          <div className="space-y-2">
            <Label>Rate</Label>
            <Select
              value={newOpening.rateMode}
              onValueChange={(value: 'free' | 'default' | 'custom') => {
                const slotDur = newOpening.multipleSlots ? Number(newOpening.interval) : Number(newOpening.duration);
                const defaultTotal = Number(getResourceRate(resourceNameForRate)) * slotDur;
                setNewOpening({
                  ...newOpening,
                  rateMode: value,
                  isFree: value === 'free',
                  customTotal: value === 'custom'
                    ? (newOpening.customTotal || defaultTotal || 0)
                    : 0,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free ($0)</SelectItem>
                <SelectItem value="default">${Number(getResourceRate(resourceNameForRate))}/hr (default)</SelectItem>
                <SelectItem value="custom">Custom total</SelectItem>
              </SelectContent>
            </Select>

            {newOpening.rateMode === 'custom' && (() => {
              const dur = newOpening.multipleSlots ? Number(newOpening.interval) : Number(newOpening.duration);
              const derivedRate = dur > 0 ? newOpening.customTotal / dur : 0;
              return (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Custom Total</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={newOpening.customTotal || ''}
                      onChange={(e) => setNewOpening({
                        ...newOpening,
                        customTotal: parseFloat(e.target.value) || 0,
                      })}
                      className="w-32"
                    />
                    <span className="text-muted-foreground text-sm">
                      (≈ ${derivedRate.toFixed(2)}/hr)
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {newOpening.worker && (() => {
            const dur = newOpening.multipleSlots ? Number(newOpening.interval) : Number(newOpening.duration);
            const defaultRate = Number(getResourceRate(resourceNameForRate));
            const total = newOpening.rateMode === 'free' ? 0
              : newOpening.rateMode === 'custom' ? Number(newOpening.customTotal) || 0
              : defaultRate * dur;
            const ratePerHr = dur > 0 ? total / dur : 0;
            return (
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Rate Preview</div>
                {newOpening.rateMode === 'free' ? (
                  <div className="font-medium">Free ($0)</div>
                ) : (
                  <>
                    <div className="font-medium">
                      {newOpening.multipleSlots
                        ? `Each slot: $${total.toFixed(2)}`
                        : `Total: $${total.toFixed(2)}`}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      (${ratePerHr.toFixed(2)}/hr)
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Accepted Payment Methods */}
          <OpeningPaymentSection
            newOpening={newOpening}
            setNewOpening={setNewOpening}
            providerPaymentMethods={providerPaymentMethods}
            setShowPaymentDialog={setShowPaymentDialog}
            setPaymentFormLabel={setPaymentFormLabel}
            setPaymentFormType={setPaymentFormType}
            resetPaymentDetails={resetPaymentDetails}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddOpening(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              await addOpening();
              if (saveAsCustom && onSaveCustomAddress) {
                onSaveCustomAddress(customLabel, newOpening.locationFields);
                setSaveAsCustom(false);
              }
            }} disabled={loading || !user}>
              {loading ? 'Adding...' : 'Add Opening'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
