import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Opening } from './types';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOpenings: Opening[];
  onSaved: (updates: { service?: string; hourly_rate?: number }) => void;
}

export function BulkEditDialog({ open, onOpenChange, selectedOpenings, onSaved }: BulkEditDialogProps) {
  const [editService, setEditService] = useState(false);
  const [editRate, setEditRate] = useState(false);
  const [service, setService] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditService(false);
      setEditRate(false);
      setService('');
      setHourlyRate('');
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!editService && !editRate) {
      toast.error('Select at least one field to edit');
      return;
    }

    const rate = editRate ? parseFloat(hourlyRate) : undefined;
    if (editRate && (isNaN(rate!) || rate! < 0)) {
      toast.error('Enter a valid hourly rate');
      return;
    }

    setSaving(true);
    try {
      const ids = selectedOpenings.map(o => o.id);

      // Build per-opening updates for total calculation
      if (editRate && rate !== undefined) {
        const updates = selectedOpenings.map(o => ({
          id: o.id,
          hourly_rate: rate,
          total: Math.round(rate * Number(o.duration) * 100) / 100,
          ...(editService ? { service } : {}),
        }));

        // Supabase doesn't support batch upsert with different values easily,
        // so we use Promise.all with individual updates
        await Promise.all(
          updates.map(u =>
            supabase.from('openings').update({
              hourly_rate: u.hourly_rate,
              total: u.total,
              ...(editService ? { service: u.service } : {}),
            }).eq('id', u.id)
          )
        );
      } else if (editService) {
        const { error } = await supabase
          .from('openings')
          .update({ service })
          .in('id', ids);
        if (error) throw error;
      }

      toast.success(`Updated ${ids.length} opening${ids.length > 1 ? 's' : ''}`);
      onSaved({
        ...(editService ? { service } : {}),
        ...(editRate ? { hourly_rate: rate } : {}),
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Bulk edit failed:', err);
      toast.error('Failed to update openings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Edit {selectedOpenings.length} Opening{selectedOpenings.length > 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service */}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={editService}
              onCheckedChange={(v) => setEditService(!!v)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1.5">
              <Label className={editService ? '' : 'text-muted-foreground'}>Service</Label>
              <Input
                placeholder="Service name"
                value={service}
                onChange={(e) => setService(e.target.value)}
                disabled={!editService}
              />
            </div>
          </div>

          {/* Hourly Rate */}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={editRate}
              onCheckedChange={(v) => setEditRate(!!v)}
              className="mt-1"
            />
            <div className="flex-1 space-y-1.5">
              <Label className={editRate ? '' : 'text-muted-foreground'}>
                Hourly Rate ($)
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                disabled={!editRate}
              />
              {editRate && hourlyRate && !isNaN(parseFloat(hourlyRate)) && (
                <p className="text-xs text-muted-foreground">
                  Total will be auto-calculated per opening based on duration
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || (!editService && !editRate)}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
