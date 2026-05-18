import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ChevronDown, Trash2, X, Pencil } from 'lucide-react';
import { DATE_FORMATS, TIME_FORMATS, LOCALE } from '@/config/formats';
import type { Opening } from './types';
import { getEffectiveTotal } from '@/lib/utils';

interface DaySlotsPanelProps {
  selectedDate: Date;
  openings: Opening[];
  user: { id: string } | null | undefined;
  collapsedWorkers: Set<string>;
  setCollapsedWorkers: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedOpeningIds: Set<string>;
  setSelectedOpeningIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  isBulkDeleting: boolean;
  handleBulkDelete: () => void;
  confirmedOpeningIds: Set<string>;
  removeOpening: (id: string) => Promise<void>;
  openEditDialog: (opening: Opening) => void;
}

export function DaySlotsPanel({
  selectedDate,
  openings,
  user,
  collapsedWorkers,
  setCollapsedWorkers,
  selectedOpeningIds,
  setSelectedOpeningIds,
  isBulkDeleting,
  handleBulkDelete,
  confirmedOpeningIds,
  removeOpening,
  openEditDialog,
}: DaySlotsPanelProps) {
  const getOpeningsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return openings.filter(opening => opening.date === dateStr);
  };

  const openingsForDate = getOpeningsForDate(selectedDate);

  const groupedByWorker = openingsForDate.reduce((acc, opening) => {
    if (!acc[opening.worker]) acc[opening.worker] = [];
    acc[opening.worker].push(opening);
    return acc;
  }, {} as { [key: string]: Opening[] });

  const workers = Object.keys(groupedByWorker).sort();

  return (
    <Card className="shadow-soft border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg font-semibold">
            {selectedDate.toLocaleDateString(LOCALE, DATE_FORMATS.weekdayShort)}
          </CardTitle>
          {openingsForDate.length > 0 && user && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedOpeningIds.size === 0 || isBulkDeleting}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedOpeningIds.size})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {workers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No openings for this date
            </div>
          ) : (
            workers.map((worker) => {
              const isCollapsed = collapsedWorkers.has(worker);
              const workerOpenings = groupedByWorker[worker];

              return (
                <div key={worker} className="border border-input rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      const newCollapsed = new Set(collapsedWorkers);
                      if (isCollapsed) newCollapsed.delete(worker);
                      else newCollapsed.add(worker);
                      setCollapsedWorkers(newCollapsed);
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      />
                      <span className="font-semibold text-foreground">{worker}</span>
                      <span className="text-xs text-muted-foreground">({workerOpenings.length})</span>
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2 p-4 bg-card/50 border-t border-input">
                      {workerOpenings.map((opening) => (
                        <div
                          key={opening.id}
                          className="p-1 rounded-lg border border-input bg-card hover:bg-accent transition-all flex items-center justify-between gap-3 cursor-pointer"
                          onClick={() => window.open(`/openings/${opening.id}`, '_blank')}
                        >
                          {!confirmedOpeningIds.has(opening.id) && (
                            <div
                              className="flex-shrink-0 flex items-center self-stretch px-2 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOpeningIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(opening.id)) next.delete(opening.id);
                                  else next.add(opening.id);
                                  return next;
                                });
                              }}
                            >
                              <Checkbox
                                checked={selectedOpeningIds.has(opening.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedOpeningIds(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(opening.id);
                                    else next.delete(opening.id);
                                    return next;
                                  });
                                }}
                              />
                            </div>
                          )}
                          <div className="text-sm space-y-1 flex-1">
                            <div className="font-medium whitespace-nowrap overflow-hidden">
                              {new Date(`1970-01-01T${opening.start_time}`).toLocaleTimeString(LOCALE, TIME_FORMATS.time24)}
                              {' - '}
                              {new Date(`1970-01-01T${opening.end_time}`).toLocaleTimeString(LOCALE, TIME_FORMATS.time24)}
                              {' '}({opening.duration}h)
                            </div>
                            <div className="font-medium">{opening.service}</div>
                            <div>
                              {(() => {
                                const total = getEffectiveTotal({
                                  total: opening.total,
                                  hourly_rate: opening.hourly_rate,
                                  duration: opening.duration,
                                });
                                return total === 0 ? 'Free' : `$${total.toFixed(2)}`;
                              })()}
                            </div>
                          </div>
                          {!confirmedOpeningIds.has(opening.id) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); openEditDialog(opening); }}
                                  disabled={!user}
                                  variant="ghost"
                                  size="sm"
                                  className="flex-shrink-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit opening</TooltipContent>
                            </Tooltip>
                          )}
                          {!confirmedOpeningIds.has(opening.id) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); removeOpening(opening.id); }}
                                  disabled={!user}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove opening</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
