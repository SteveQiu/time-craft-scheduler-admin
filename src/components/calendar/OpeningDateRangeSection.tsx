import React from 'react';
import { addMonths, format } from 'date-fns';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import type { NewOpeningForm } from './types';

interface OpeningDateRangeSectionProps {
  newOpening: NewOpeningForm;
  setNewOpening: React.Dispatch<React.SetStateAction<NewOpeningForm>>;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  isPremium: boolean;
}

export function OpeningDateRangeSection({
  newOpening,
  setNewOpening,
  errors,
  setErrors,
  isPremium,
}: OpeningDateRangeSectionProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const maxStartDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
  const maxEndDate = format(addMonths(new Date(), isPremium ? 3 : 1), 'yyyy-MM-dd');

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dateRangeStart">Start Date</Label>
        <Input
          type="date"
          value={newOpening.dateRangeStart}
          min={today}
          max={maxStartDate}
          onChange={(e) => {
            setNewOpening({ ...newOpening, dateRangeStart: e.target.value });
            setErrors(prev => ({ ...prev, dateRangeStart: '' }));
          }}
        />
        {errors.dateRangeStart && <p className="text-sm text-destructive">{errors.dateRangeStart}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateRangeEnd">End Date</Label>
        <Input
          type="date"
          value={newOpening.dateRangeEnd}
          min={newOpening.dateRangeStart || today}
          max={maxEndDate}
          onChange={(e) => {
            setNewOpening({ ...newOpening, dateRangeEnd: e.target.value });
            setErrors(prev => ({ ...prev, dateRangeEnd: '' }));
          }}
        />
        {errors.dateRangeEnd && <p className="text-sm text-destructive">{errors.dateRangeEnd}</p>}
      </div>

      <div className="space-y-2">
        <Label>Days of Week</Label>
        <div className="grid grid-cols-4 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                const newWeekdays = new Set(newOpening.weekdays);
                if (newWeekdays.has(index)) newWeekdays.delete(index);
                else newWeekdays.add(index);
                setNewOpening({ ...newOpening, weekdays: newWeekdays });
              }}
              className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                newOpening.weekdays.has(index)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
