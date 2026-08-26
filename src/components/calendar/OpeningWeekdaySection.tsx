import type React from 'react';
import { Label } from '../ui/label';
import type { NewOpeningForm } from './types';

interface OpeningWeekdaySectionProps {
  newOpening: NewOpeningForm;
  setNewOpening: React.Dispatch<React.SetStateAction<NewOpeningForm>>;
  error?: string;
}

export function OpeningWeekdaySection({
  newOpening,
  setNewOpening,
  error,
}: OpeningWeekdaySectionProps) {
  return (
    <div className="space-y-2">
      <Label>Days of Week</Label>
      <div className="grid grid-cols-4 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <button
            key={day}
            type="button"
            onClick={() => {
              const weekdays = new Set(newOpening.weekdays);
              if (weekdays.has(index)) weekdays.delete(index);
              else weekdays.add(index);
              setNewOpening({ ...newOpening, weekdays });
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
