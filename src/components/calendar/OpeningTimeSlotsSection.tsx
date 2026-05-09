import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { generateEndTimeOptions, generateDurationOptions } from './calendarUtils';
import type { NewOpeningForm } from './types';

interface OpeningTimeSlotsSectionProps {
  newOpening: NewOpeningForm;
  setNewOpening: React.Dispatch<React.SetStateAction<NewOpeningForm>>;
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export function OpeningTimeSlotsSection({
  newOpening,
  setNewOpening,
  errors,
  setErrors,
}: OpeningTimeSlotsSectionProps) {
  if (newOpening.multipleSlots) {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Select
            value={newOpening.endTime}
            onValueChange={(value) => {
              setNewOpening({ ...newOpening, endTime: value });
              setErrors(prev => ({ ...prev, endTime: '' }));
            }}
          >
            <SelectTrigger className={errors.endTime ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select end time" />
            </SelectTrigger>
            <SelectContent>
              {generateEndTimeOptions(newOpening.startTime).map((time) => (
                <SelectItem key={time} value={time}>{time}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.endTime && <p className="text-sm text-destructive">{errors.endTime}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interval">Interval (hours)</Label>
          <Select
            value={newOpening.interval.toString()}
            onValueChange={(value) => {
              setNewOpening({ ...newOpening, interval: parseInt(value) });
              setErrors(prev => ({ ...prev, interval: '' }));
            }}
          >
            <SelectTrigger className={errors.interval ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {generateDurationOptions().map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.interval && <p className="text-sm text-destructive">{errors.interval}</p>}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="duration">Duration</Label>
      <Select
        value={newOpening.duration.toString()}
        onValueChange={(value) => {
          setNewOpening({ ...newOpening, duration: parseInt(value) });
          setErrors(prev => ({ ...prev, duration: '' }));
        }}
      >
        <SelectTrigger className={errors.duration ? 'border-destructive' : ''}>
          <SelectValue placeholder="Select duration" />
        </SelectTrigger>
        <SelectContent>
          {generateDurationOptions().map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.duration && <p className="text-sm text-destructive">{errors.duration}</p>}
    </div>
  );
}
