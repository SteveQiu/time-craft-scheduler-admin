import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { ChevronLeft, ChevronRight, Plus, Clock, User, X, DollarSign } from 'lucide-react';

interface TimeSlot {
  id: string;
  time: string;
  worker: string;
  service: string;
  client?: string;
  status: 'available' | 'booked' | 'blocked';
}

interface Opening {
  id: string;
  date: string;
  startTime: string;
  duration: number;
  worker: string;
  service: string;
  rate: number;
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [newOpening, setNewOpening] = useState({
    startTime: '',
    endTime: '',
    duration: 1,
    worker: '',
    service: '',
    multipleSlots: false,
    interval: 1
  });

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

  const getOpeningsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return openings.filter(opening => opening.date === dateStr);
  };

  const hasOpenings = (date: Date | null) => {
    if (!date) return false;
    return getOpeningsForDate(date).length > 0;
  };

  const getWorkerRate = (workerName: string) => {
    const rates: Record<string, number> = {
      'Sarah Johnson': 65,
      'Mike Wilson': 80,
      'Lisa Chen': 120
    };
    return rates[workerName] || 50;
  };

  const addOpening = () => {
    if (!newOpening.startTime || !newOpening.worker || !newOpening.service) return;
    
    const rate = getWorkerRate(newOpening.worker);
    
    if (newOpening.multipleSlots && newOpening.endTime) {
      // Create multiple slots with intervals
      const newOpenings: Opening[] = [];
      const start = parseTime(newOpening.startTime);
      const end = parseTime(newOpening.endTime);
      let current = start;
      
      while (current < end) {
        const timeStr = formatTime(current);
        newOpenings.push({
          id: `${Date.now()}-${current}`,
          date: selectedDate.toDateString(),
          startTime: timeStr,
          duration: newOpening.interval,
          worker: newOpening.worker,
          service: newOpening.service,
          rate: rate * newOpening.interval
        });
        current += newOpening.interval * 60; // Add interval in minutes
      }
      
      setOpenings([...openings, ...newOpenings]);
    } else {
      // Create single slot
      const opening: Opening = {
        id: Date.now().toString(),
        date: selectedDate.toDateString(),
        startTime: newOpening.startTime,
        duration: newOpening.duration,
        worker: newOpening.worker,
        service: newOpening.service,
        rate: rate * newOpening.duration
      };
      
      setOpenings([...openings, opening]);
    }
    
    setNewOpening({ 
      startTime: '', 
      endTime: '',
      duration: 1, 
      worker: '', 
      service: '',
      multipleSlots: false,
      interval: 1
    });
    setShowAddOpening(false);
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const removeOpening = (id: string) => {
    setOpenings(openings.filter(opening => opening.id !== id));
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      options.push(`${hour.toString().padStart(2, '0')}:00`);
      options.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return options;
  };

  const generateDurationOptions = () => {
    const options = [];
    for (let i = 1; i <= 24; i++) {
      options.push({ value: i, label: `${i} hour${i > 1 ? 's' : ''}` });
    }
    return options;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-foreground">Opening</h2>
        <Button onClick={() => setShowAddOpening(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Add Opening</span>
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
                  className={`p-2 h-12 flex flex-col items-center justify-center text-sm cursor-pointer rounded-lg transition-colors relative ${
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
                  <span>{date?.getDate()}</span>
                  {date && hasOpenings(date) && (
                    <div className="w-2 h-2 bg-primary rounded-full mt-0.5 animate-pulse shadow-sm" />
                  )}
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
              {getOpeningsForDate(selectedDate).map((opening) => (
                <div
                  key={opening.id}
                  className="p-3 rounded-lg border transition-all bg-success-light text-success border-success"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{opening.startTime}</span>
                      <span className="text-xs">({opening.duration}h)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOpening(opening.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                   <div className="text-sm space-y-1">
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3" />
                      <span>{opening.worker}</span>
                    </div>
                    <div className="font-medium">{opening.service}</div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-3 w-3" />
                      <span>${opening.rate}</span>
                    </div>
                  </div>
                </div>
              ))}
              {getOpeningsForDate(selectedDate).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No openings for this date
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddOpening} onOpenChange={setShowAddOpening}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Opening for {selectedDate.toLocaleDateString()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={newOpening.multipleSlots} 
                onCheckedChange={(checked) => setNewOpening({...newOpening, multipleSlots: checked})}
              />
              <Label>Create multiple time slots</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Select value={newOpening.startTime} onValueChange={(value) => setNewOpening({...newOpening, startTime: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newOpening.multipleSlots && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Select value={newOpening.endTime} onValueChange={(value) => setNewOpening({...newOpening, endTime: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interval">Interval (hours)</Label>
                  <Select value={newOpening.interval.toString()} onValueChange={(value) => setNewOpening({...newOpening, interval: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateDurationOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {!newOpening.multipleSlots && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select value={newOpening.duration.toString()} onValueChange={(value) => setNewOpening({...newOpening, duration: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateDurationOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="worker">Worker</Label>
              <Select value={newOpening.worker} onValueChange={(value) => setNewOpening({...newOpening, worker: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select worker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                  <SelectItem value="Mike Wilson">Mike Wilson</SelectItem>
                  <SelectItem value="Lisa Chen">Lisa Chen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Select value={newOpening.service} onValueChange={(value) => setNewOpening({...newOpening, service: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hair Cut">Hair Cut</SelectItem>
                  <SelectItem value="Massage">Massage</SelectItem>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newOpening.worker && (
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Rate Preview</div>
                <div className="font-medium">${getWorkerRate(newOpening.worker)}/hour</div>
                {newOpening.multipleSlots ? (
                  <div className="text-sm">Each slot: ${getWorkerRate(newOpening.worker) * newOpening.interval}</div>
                ) : (
                  <div className="text-sm">Total: ${getWorkerRate(newOpening.worker) * newOpening.duration}</div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddOpening(false)}>
                Cancel
              </Button>
              <Button onClick={addOpening}>
                Add Opening
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}