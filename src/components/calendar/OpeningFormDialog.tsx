import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { AddressInput } from '@/components/ui/AddressInput';
import {
  generateTimeOptions,
} from './calendarUtils';
import type { NewOpeningForm } from './types';
import { OpeningTimeSlotsSection } from './OpeningTimeSlotsSection';
import { OpeningDateRangeSection } from './OpeningDateRangeSection';
import { OpeningPaymentSection } from './OpeningPaymentSection';

interface AcceptedWorker {
  id: string;
  worker_name: string;
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
  isOrgMode: boolean;
  acceptedWorkers: AcceptedWorker[];
  selfWorkerName: string;
  getWorkerSkills: (name: string) => string[];
  getWorkerRate: (name: string) => number;
  savedAddresses: any[];
  providerPaymentMethods: { id: string; label: string; type: string }[];
  addOpening: () => Promise<void>;
  setShowPaymentDialog: (show: boolean) => void;
  setPaymentFormLabel: (label: string) => void;
  setPaymentFormType: (type: string) => void;
  resetPaymentDetails: () => void;
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
  isOrgMode,
  acceptedWorkers,
  selfWorkerName,
  getWorkerSkills,
  getWorkerRate,
  savedAddresses,
  providerPaymentMethods,
  addOpening,
  setShowPaymentDialog,
  setPaymentFormLabel,
  setPaymentFormType,
  resetPaymentDetails,
}: OpeningFormDialogProps) {
  const workerNameForRate = isOrgMode ? newOpening.worker : selfWorkerName;

  return (
    <Dialog open={showAddOpening} onOpenChange={setShowAddOpening}>
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
            />
          )}

          {isOrgMode ? (
            <div className="space-y-2">
              <Label htmlFor="worker">Worker</Label>
              <Select
                value={newOpening.worker}
                onValueChange={(value) => {
                  const skills = getWorkerSkills(value);
                  setNewOpening({ ...newOpening, worker: value, service: skills[0] || '' });
                  setErrors(prev => ({ ...prev, worker: '', service: '' }));
                }}
              >
                <SelectTrigger className={errors.worker ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  {acceptedWorkers.map((w) => (
                    <SelectItem key={w.id} value={w.worker_name}>{w.worker_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.worker && <p className="text-sm text-destructive">{errors.worker}</p>}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Worker</Label>
              <Input value={selfWorkerName} disabled className="bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <Select
              value={newOpening.service}
              onValueChange={(value) => {
                setNewOpening({ ...newOpening, service: value });
                setErrors(prev => ({ ...prev, service: '' }));
              }}
            >
              <SelectTrigger className={errors.service ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {getWorkerSkills(workerNameForRate).map((skill) => (
                  <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
          </div>

          {/* Rate Selector */}
          <div className="space-y-2">
            <Label>Rate</Label>
            <Select
              value={newOpening.isFree ? 'free' : 'paid'}
              onValueChange={(value) => setNewOpening({ ...newOpening, isFree: value === 'free' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free ($0/hr)</SelectItem>
                <SelectItem value="paid">${Number(getWorkerRate(workerNameForRate))}/hr</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(isOrgMode ? newOpening.worker : true) && (
            <div className="bg-secondary/30 p-3 rounded-lg">
              <div className="text-sm text-muted-foreground">Rate Preview</div>
              <div className="font-medium">
                {newOpening.isFree ? 'Free ($0/hr)' : `$${Number(getWorkerRate(workerNameForRate))}/hr`}
              </div>
              {!newOpening.isFree && (
                newOpening.multipleSlots ? (
                  <div className="text-sm">Each slot: ${Number(getWorkerRate(workerNameForRate)) * Number(newOpening.interval)}</div>
                ) : (
                  <div className="text-sm">Total: ${Number(getWorkerRate(workerNameForRate)) * Number(newOpening.duration)}</div>
                )
              )}
            </div>
          )}

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
            <Button onClick={addOpening} disabled={loading || !user}>
              {loading ? 'Adding...' : 'Add Opening'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
