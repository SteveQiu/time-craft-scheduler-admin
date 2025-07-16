import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Plus, Clock, User } from 'lucide-react';

interface TimeSlot {
  id: string;
  time: string;
  worker: string;
  service: string;
  client?: string;
  status: 'available' | 'booked' | 'blocked';
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const timeSlots: TimeSlot[] = [
    { id: '1', time: '9:00 AM', worker: 'Sarah Johnson', service: 'Hair Cut', status: 'available' },
    { id: '2', time: '10:00 AM', worker: 'Sarah Johnson', service: 'Hair Cut', client: 'John Doe', status: 'booked' },
    { id: '3', time: '11:00 AM', worker: 'Mike Wilson', service: 'Massage', status: 'available' },
    { id: '4', time: '2:00 PM', worker: 'Lisa Chen', service: 'Consultation', client: 'Jane Smith', status: 'booked' },
    { id: '5', time: '3:00 PM', worker: 'Sarah Johnson', service: 'Hair Cut', status: 'blocked' },
    { id: '6', time: '4:00 PM', worker: 'Mike Wilson', service: 'Massage', status: 'available' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success-light text-success border-success';
      case 'booked': return 'bg-primary-light text-primary border-primary';
      case 'blocked': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-secondary text-secondary-foreground border-card-border';
    }
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return date1.toDateString() === date2.toDateString();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Calendar</h2>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Appointment</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
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
            <div className="grid grid-cols-7 gap-1">
              {getDaysInMonth(currentDate).map((date, index) => (
                <div
                  key={index}
                  className={`p-2 h-12 flex items-center justify-center text-sm cursor-pointer rounded-lg transition-colors ${
                    !date
                      ? ''
                      : isToday(date)
                      ? 'bg-calendar-today text-primary-foreground font-bold'
                      : isSameDate(date, selectedDate)
                      ? 'bg-primary-light text-primary'
                      : 'hover:bg-secondary'
                  }`}
                  onClick={() => date && setSelectedDate(date)}
                >
                  {date?.getDate()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card className="shadow-soft border-card-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`p-3 rounded-lg border transition-all calendar-slot ${getStatusColor(slot.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{slot.time}</span>
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wide">
                      {slot.status}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3" />
                      <span>{slot.worker}</span>
                    </div>
                    <div className="font-medium">{slot.service}</div>
                    {slot.client && (
                      <div className="text-xs opacity-75">Client: {slot.client}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}