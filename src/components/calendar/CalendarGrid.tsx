import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  monthNames,
  getDaysInMonth,
  isToday,
  isSameDate,
  isDisabledDate,
} from './calendarUtils';
import type { Opening } from './types';

interface CalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  setSelectedOpeningIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  loading: boolean;
  openings: Opening[];
  isPremium: boolean;
  navigateMonth: (direction: 'prev' | 'next') => void;
}

export function CalendarGrid({
  currentDate,
  selectedDate,
  setSelectedDate,
  setSelectedOpeningIds,
  loading,
  openings,
  isPremium,
  navigateMonth,
}: CalendarGridProps) {
  const getOpeningsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return openings.filter(opening => opening.date === dateStr);
  };

  return (
    <Card className="lg:col-span-2 shadow-soft border-card-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
              <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></span>
            </div>
          )}
          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth(currentDate).map((date, index) => {
              const openingCount = date ? getOpeningsForDate(date).length : 0;
              const disabled = isDisabledDate(date, isPremium);
              return (
                <div
                  key={index}
                  className={`p-2 h-12 flex flex-col items-center justify-center text-sm rounded-lg transition-colors relative ${
                    !date
                      ? ''
                      : disabled
                      ? 'opacity-30 cursor-not-allowed text-muted-foreground'
                      : isToday(date)
                      ? 'bg-calendar-today text-primary-foreground font-bold cursor-pointer'
                      : isSameDate(date, selectedDate)
                      ? 'bg-primary-light text-primary ring-2 ring-primary ring-offset-2 ring-offset-background cursor-pointer'
                      : 'hover:bg-secondary cursor-pointer'
                  }`}
                  onClick={() => {
                    if (date && !disabled) {
                      setSelectedDate(date);
                      setSelectedOpeningIds(new Set());
                    }
                  }}
                >
                  <span>{date?.getDate()}</span>
                  {date && openingCount > 0 && (
                    <span
                      className="block text-xs rounded-full bg-primary text-primary-foreground px-1 mt-1 mx-auto min-w-[1.5em] text-center"
                      title={`${openingCount} opening${openingCount > 1 ? 's' : ''}`}
                    >
                      {openingCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
