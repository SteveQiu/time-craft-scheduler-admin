import React from 'react';
import { format } from 'date-fns';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import type { NewOpeningForm } from './types';
import { OpeningWeekdaySection } from './OpeningWeekdaySection';
import { getOpeningDateLimit } from './calendarUtils';

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
  const maxStartDate = format(getOpeningDateLimit(isPremium), 'yyyy-MM-dd');
  const maxEndDate = format(getOpeningDateLimit(isPremium), 'yyyy-MM-dd');

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

      <OpeningWeekdaySection
        newOpening={newOpening}
        setNewOpening={setNewOpening}
        error={errors.weekdays}
      />
    </>
  );
}
