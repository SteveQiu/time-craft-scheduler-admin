import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { TIME_FORMATS, LOCALE } from '@/config/formats';
import type { Opening } from './types';

interface DeleteOpeningDialogProps {
  showBulkDeleteConfirm: boolean;
  setShowBulkDeleteConfirm: (show: boolean) => void;
  blockedOpenings: Opening[];
  setBlockedOpenings: (openings: Opening[]) => void;
  safeIdsToDelete: string[];
  setSafeIdsToDelete: (ids: string[]) => void;
  deleteSafeOpenings: (ids: string[]) => Promise<void>;
}

export function DeleteOpeningDialog({
  showBulkDeleteConfirm,
  setShowBulkDeleteConfirm,
  blockedOpenings,
  setBlockedOpenings,
  safeIdsToDelete,
  setSafeIdsToDelete,
  deleteSafeOpenings,
}: DeleteOpeningDialogProps) {
  const handleClose = () => {
    setShowBulkDeleteConfirm(false);
    setBlockedOpenings([]);
    setSafeIdsToDelete([]);
  };

  return (
    <Dialog
      open={showBulkDeleteConfirm}
      onOpenChange={(open) => { if (!open) handleClose(); }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Openings with Active Appointments</DialogTitle>
          <DialogDescription>
            Some selected openings have pending or confirmed appointments. Please modify or reach out to customers for the following openings before deleting:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {blockedOpenings.map(o => (
            <div key={o.id} className="text-sm p-2 rounded bg-destructive/10 border border-destructive/20">
              <span className="font-medium">{o.date}</span>
              {' · '}
              {new Date(`1970-01-01T${o.start_time}`).toLocaleTimeString(LOCALE, TIME_FORMATS.time24)}
              {' – '}
              {new Date(`1970-01-01T${o.end_time}`).toLocaleTimeString(LOCALE, TIME_FORMATS.time24)}
              {' · '}
              {o.worker}
              {' · '}
              {o.service}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Please modify these openings or reach out to your customers before deleting.
        </p>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose}>
            Go Back
          </Button>
          {safeIdsToDelete.length > 0 && (
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteSafeOpenings(safeIdsToDelete);
                } catch {
                  toast.error('Failed to delete openings');
                }
                handleClose();
              }}
            >
              Delete Safe Ones ({safeIdsToDelete.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
