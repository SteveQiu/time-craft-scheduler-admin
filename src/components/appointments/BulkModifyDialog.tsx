import React from 'react';
import { Loader2, Calendar, Clock, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { parseLocation, formatLocation } from '@/lib/address';
import { Appointment } from './types';

interface BulkModifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkModifyQueue: Appointment[];
  bulkModifyIndex: number;
  bulkModifyAvailableOpenings: any[];
  bulkModifyLoadingOpenings: boolean;
  bulkModifyModifying: string | null;
  onSkip: () => void;
  onSelect: (openingId: string) => void;
}

export function BulkModifyDialog({
  open,
  onOpenChange,
  bulkModifyQueue,
  bulkModifyIndex,
  bulkModifyAvailableOpenings,
  bulkModifyLoadingOpenings,
  bulkModifyModifying,
  onSkip,
  onSelect,
}: BulkModifyDialogProps) {
  const current = bulkModifyQueue[bulkModifyIndex];
  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Modify Appointment {bulkModifyIndex + 1} of {bulkModifyQueue.length} — {current.worker}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-3">
          <p>Current: {new Date(current.date).toLocaleDateString()} {current.start_time}–{current.end_time}</p>
          {current.booker_name && <p>Customer: {current.booker_name}</p>}
        </div>
        <Button variant="ghost" size="sm" className="mb-3 text-muted-foreground" onClick={onSkip}>
          Skip this one →
        </Button>
        {bulkModifyLoadingOpenings && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!bulkModifyLoadingOpenings && bulkModifyAvailableOpenings.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No available openings to switch to.</p>
        )}
        <div className="space-y-3">
          {bulkModifyAvailableOpenings.map((opening) => (
            <Card key={opening.id} className="shadow-soft border-card-border hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{opening.worker} — {opening.service}</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(opening.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {opening.start_time} - {opening.end_time}
                    </span>
                    {opening.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {formatLocation(parseLocation(opening.location))}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!!bulkModifyModifying}
                  onClick={() => onSelect(opening.id)}
                >
                  {bulkModifyModifying === opening.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Select'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
