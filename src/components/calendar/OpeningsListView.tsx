import { useState, useMemo, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOpeningsList } from '@/hooks/useOpeningsList';
import { BulkEditDialog } from './BulkEditDialog';
import type { Opening } from './types';

interface OpeningsListViewProps {
  userId: string | undefined;
}

const LOCALE = undefined;

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(LOCALE, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(timeStr: string) {
  return new Date(`1970-01-01T${timeStr}`).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDuration(hours: number) {
  if (hours === 0.5) return '30m';
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`;
}

function getEffectiveTotal(opening: Opening) {
  const persisted = Number(opening.total ?? 0);
  if (persisted > 0) return persisted;
  return Number(opening.hourly_rate) * Number(opening.duration);
}

export function OpeningsListView({ userId }: OpeningsListViewProps) {
  const { openings, loading, confirmedOpeningIds, reload, removeOpenings, updateOpenings } = useOpeningsList({ userId });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const lastClickedIndex = useRef<number | null>(null);

  const editableIds = useMemo(() => new Set(
    openings.filter(o => !confirmedOpeningIds.has(o.id)).map(o => o.id)
  ), [openings, confirmedOpeningIds]);

  const allEditableSelected = editableIds.size > 0 && [...editableIds].every(id => selectedIds.has(id));

  const handleRowClick = (index: number, e: React.MouseEvent) => {
    const opening = openings[index];
    if (confirmedOpeningIds.has(opening.id)) return;

    if (e.shiftKey && lastClickedIndex.current !== null) {
      const start = Math.min(lastClickedIndex.current, index);
      const end = Math.max(lastClickedIndex.current, index);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          const id = openings[i].id;
          if (editableIds.has(id)) next.add(id);
        }
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(opening.id)) next.delete(opening.id); else next.add(opening.id);
        return next;
      });
    }
    lastClickedIndex.current = index;
  };

  const toggleAll = () => {
    if (allEditableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(editableIds));
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds].filter(id => editableIds.has(id));
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('openings').delete().in('id', ids);
      if (error) throw error;
      removeOpenings(new Set(ids));
      setSelectedIds(new Set());
      toast.success(`Deleted ${ids.length} opening${ids.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      toast.error('Failed to delete openings');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedOpenings = useMemo(
    () => openings.filter(o => selectedIds.has(o.id) && editableIds.has(o.id)),
    [openings, selectedIds, editableIds]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (openings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No upcoming openings found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setShowBulkEdit(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3">
                <div className="flex items-center justify-center min-w-[44px] min-h-[44px]" onClick={toggleAll}>
                  <Checkbox
                    checked={allEditableSelected}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleAll()}
                  />
                </div>
              </th>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Time</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">Duration</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Worker</th>
              <th className="text-left p-3 font-medium">Service</th>
              <th className="text-right p-3 font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {openings.map((opening, index) => {
              const isConfirmed = confirmedOpeningIds.has(opening.id);
              const isSelected = selectedIds.has(opening.id);
              const total = getEffectiveTotal(opening);
              return (
                <tr
                  key={opening.id}
                  className={`border-t transition-colors cursor-pointer select-none ${
                    isSelected ? 'bg-primary/5' : 'hover:bg-accent/50'
                  } ${isConfirmed ? 'opacity-60' : ''}`}
                  onClick={(e) => handleRowClick(index, e)}
                >
                  <td className="p-3">
                    <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                      {isConfirmed ? (
                        <span className="text-xs text-muted-foreground">Booked</span>
                      ) : (
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => handleRowClick(index, { shiftKey: false } as React.MouseEvent)}
                        />
                      )}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{formatDate(opening.date)}</td>
                  <td className="p-3 whitespace-nowrap">
                    {formatTime(opening.start_time)} – {formatTime(opening.end_time)}
                  </td>
                  <td className="p-3 hidden sm:table-cell">{formatDuration(Number(opening.duration))}</td>
                  <td className="p-3 hidden md:table-cell truncate max-w-[120px]">{opening.worker}</td>
                  <td className="p-3 truncate max-w-[150px]">{opening.service}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {total === 0 ? 'Free' : `$${total.toFixed(2)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <BulkEditDialog
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        selectedOpenings={selectedOpenings}
        onSaved={(updates) => {
          // Compute per-opening total if hourly_rate changed
          if (updates.hourly_rate !== undefined) {
            const ids = new Set(selectedOpenings.map(o => o.id));
            updateOpenings(ids, { hourly_rate: updates.hourly_rate });
          }
          if (updates.service !== undefined) {
            const ids = new Set(selectedOpenings.map(o => o.id));
            updateOpenings(ids, { service: updates.service });
          }
          setSelectedIds(new Set());
          reload();
        }}
      />
    </div>
  );
}
