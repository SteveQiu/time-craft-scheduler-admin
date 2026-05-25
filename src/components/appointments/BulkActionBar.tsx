import React from 'react';
import { Check, CheckCircle, ArrowRightLeft, X, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment } from './types';
import { downloadICS } from './calendarExport';

interface BulkActionBarProps {
  selectedIds: Set<string>;
  appointments: Appointment[];
  userId: string | undefined;
  isBulkActing: boolean;
  isOrgView: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onComplete: () => void;
  onModify: () => void;
  onCancel: () => void;
  onClear: () => void;
}

export function BulkActionBar({
  selectedIds,
  appointments,
  userId,
  isBulkActing,
  isOrgView,
  onApprove,
  onDeny,
  onComplete,
  onModify,
  onCancel,
  onClear,
}: BulkActionBarProps) {
  if (selectedIds.size === 0) return null;

  const selectedAppts = appointments.filter(a => selectedIds.has(a.id));
  const pendingAppts = selectedAppts.filter(a => a.status === 'pending');
  const confirmedAppts = selectedAppts.filter(a => a.status === 'confirmed');
  const actionableAppts = [...pendingAppts, ...confirmedAppts];
  const providerPendingAppts = pendingAppts.filter(a => a.provider_id === userId);
  const manageableConfirmedAppts = confirmedAppts.filter(a => isOrgView || a.provider_id === userId);
  const modifiableAppts = actionableAppts.filter(a => isOrgView || a.provider_id === userId || a.user_id === userId);
  const hasPending = pendingAppts.length > 0;
  const isProviderOfAny = selectedAppts.some(a => a.provider_id === userId);
  const hasConfirmed = confirmedAppts.length > 0;
  const canManageAny = manageableConfirmedAppts.length > 0;
  const canModifyAny = modifiableAppts.length > 0;

  return (
    <div className="sticky top-4 z-10 bg-card border border-border rounded-lg shadow-lg p-3 flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
      <div className="flex flex-wrap gap-2 ml-auto">
        {hasPending && isProviderOfAny && (
          <Button size="sm" variant="default" disabled={isBulkActing} onClick={onApprove}>
            <Check className="h-3 w-3 mr-1" /> Approve ({providerPendingAppts.length})
          </Button>
        )}
        {hasPending && isProviderOfAny && (
          <Button size="sm" variant="destructive" disabled={isBulkActing} onClick={onDeny}>
            <X className="h-3 w-3 mr-1" /> Deny ({providerPendingAppts.length})
          </Button>
        )}
        {hasConfirmed && canManageAny && (
          <Button size="sm" variant="default" disabled={isBulkActing} onClick={onComplete}>
            <CheckCircle className="h-3 w-3 mr-1" /> Complete ({manageableConfirmedAppts.length})
          </Button>
        )}
        {canModifyAny && (hasPending || hasConfirmed) && (
          <Button size="sm" variant="outline" disabled={isBulkActing} onClick={onModify}>
            <ArrowRightLeft className="h-3 w-3 mr-1" /> Modify ({modifiableAppts.length})
          </Button>
        )}
        {(hasPending || hasConfirmed) && (() => {
          const cancelCount = actionableAppts.length;
          const allPending = selectedAppts.every(a => a.status === 'pending');
          const isProvider = isOrgView || isProviderOfAny;
          const label = allPending && isProvider ? 'Reject' : 'Cancel';
          return (
            <Button size="sm" variant="outline" disabled={isBulkActing} onClick={onCancel}>
              <X className="h-3 w-3 mr-1" /> {label} ({cancelCount})
            </Button>
          );
        })()}
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadICS(selectedAppts)}
        >
          <CalendarPlus className="h-3 w-3 mr-1" /> Add to Calendar ({selectedAppts.length})
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
