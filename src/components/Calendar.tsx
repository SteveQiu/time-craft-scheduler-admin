import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { ChevronLeft, ChevronRight, Plus, Clock, User, X, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useQuery } from '@tanstack/react-query';
import { useOrgWorkers } from '@/hooks/useOrgWorkers';

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
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  worker: string;
  service: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export function Calendar() {
  const { user } = useAuth();
  const { isOrganization, isInternalDev } = useUserRoles();
  const isOrgMode = isOrganization || isInternalDev;
  const { workers: workerData, getWorkerRate: getOrgWorkerRate, getWorkerSkills: getOrgWorkerSkills } = useOrgWorkers();

  // Fetch own profile for user mode (skills & rate)
  const { data: ownProfile } = useQuery({
    queryKey: ['own-profile-for-openings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, skills, hourly_rate')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as { full_name: string | null; skills: string[]; hourly_rate: number };
    },
    enabled: !!user && !isOrgMode,
  });

  const getWorkerRate = (name: string) => {
    if (isOrgMode) return getOrgWorkerRate(name);
    return ownProfile?.hourly_rate ?? 0;
  };

  const getWorkerSkills = (name: string) => {
    if (isOrgMode) return getOrgWorkerSkills(name);
    return ownProfile?.skills ?? [];
  };

  const selfWorkerName = ownProfile?.full_name || user?.email || 'Me';
  // Helper to parse time string (e.g., '09:00') to minutes since midnight
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const startMinutes = parseTime(startTime);
    const endMinutes = startMinutes + duration * 60;
    return formatTime(endMinutes);
  };
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch saved workplace addresses
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['workplace-addresses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workplace_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
  const [newOpening, setNewOpening] = useState({
    startTime: '09:00',
    endTime: '',
    duration: 1,
    worker: 'Sarah Johnson',
    service: 'Hair Cut',
    location: '',
    multipleSlots: false,
    interval: 1
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Load all openings for the selected month once
  useEffect(() => {
    if (currentDate && user) {
      loadOpeningsForMonth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, user]);

  // Only fetch once per month, store all in state
  const loadOpeningsForMonth = async () => {
    if (!currentDate || !user) return;
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startStr = firstDay.toISOString().split('T')[0];
      const endStr = lastDay.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('openings')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date')
        .order('start_time');

      if (error) throw error;
      setOpenings(data || []);
    } catch (error) {
      console.error('Error loading openings:', error);
      toast.error('Failed to load openings');
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!newOpening.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (isOrgMode && !newOpening.worker) {
      newErrors.worker = 'Worker selection is required';
    }
    
    if (!newOpening.service) {
      newErrors.service = 'Service selection is required';
    }
    
    if (newOpening.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }
    
    if (newOpening.multipleSlots && newOpening.interval <= 0) {
      newErrors.interval = 'Interval must be greater than 0';
    }
    
    if (newOpening.multipleSlots && !newOpening.endTime) {
      newErrors.endTime = 'End time is required for multiple slots';
    }
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (newOpening.startTime && !timeRegex.test(newOpening.startTime)) {
      newErrors.startTime = 'Invalid time format';
    }
    
    if (newOpening.multipleSlots && newOpening.endTime && !timeRegex.test(newOpening.endTime)) {
      newErrors.endTime = 'Invalid time format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDate = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return date1.toDateString() === date2.toDateString();
  };

  // Use only stored openings for per-date display
  const getOpeningsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return openings.filter(opening => opening.date === dateStr);
  };

  const hasOpenings = (date: Date | null) => {
    if (!date) return false;
    return getOpeningsForDate(date).length > 0;
  };

  // getWorkerRate is now imported from @/data/workers

  // --- addOpening function restored below ---
  const addOpening = async () => {
    if (!user) {
      toast.error('Please sign in to add openings');
      return;
    }
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }
    setLoading(true);
    const workerName = isOrgMode ? newOpening.worker : selfWorkerName;
    try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        if (newOpening.multipleSlots && newOpening.endTime) {
          // Create multiple slots with intervals
          const newOpenings = [];
          const start = parseTime(newOpening.startTime);
          const end = parseTime(newOpening.endTime);
          let current = start;
          while (current < end) {
            const startTimeStr = formatTime(current);
            const endTimeStr = calculateEndTime(startTimeStr, newOpening.interval);
            newOpenings.push({
              user_id: user.id,
              date: dateStr,
              start_time: startTimeStr,
              end_time: endTimeStr,
              duration: newOpening.interval,
              worker: workerName,
              service: newOpening.service,
              location: newOpening.location || null,
              is_available: true
            });
            current += newOpening.interval * 60; // Add interval in minutes
          }
          const { error } = await supabase
            .from('openings')
            .insert(newOpenings);
          if (error) throw error;
          toast.success(`${newOpenings.length} openings added successfully`);
        } else {
          // Create single slot
          const opening = {
            user_id: user.id,
            date: dateStr,
            start_time: newOpening.startTime,
            end_time: calculateEndTime(newOpening.startTime, newOpening.duration),
            duration: newOpening.duration,
            worker: workerName,
            service: newOpening.service,
            location: newOpening.location || null,
            is_available: true
          };
          const { error } = await supabase
            .from('openings')
            .insert([opening]);
          if (error) throw error;
          toast.success('Opening added successfully');
        }
        // Refresh all openings for the month after add
        await loadOpeningsForMonth();
        resetForm();
        setShowAddOpening(false);
      } catch (error) {
        console.error('Error adding opening:', error);
        toast.error('Failed to add opening');
      } finally {
        setLoading(false);
      }
    };
// ...existing code...

  const resetForm = () => {
    setNewOpening({ 
      startTime: '09:00', 
      endTime: '',
      duration: 1, 
      worker: 'Sarah Johnson', 
      service: 'Hair Cut',
      location: '',
      multipleSlots: false,
      interval: 1
    });
    setErrors({});
  };

  const removeOpening = async (id: string) => {
    if (!user) {
      toast.error('Please sign in to remove openings');
      return;
    }

    try {
      const { error } = await supabase
        .from('openings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Additional security check

      if (error) throw error;
      
  await loadOpeningsForMonth();
      toast.success('Opening removed successfully');
    } catch (error) {
      console.error('Error removing opening:', error);
      toast.error('Failed to remove opening');
    }
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
        <Button 
          onClick={() => setShowAddOpening(true)} 
          className="flex items-center space-x-2"
          disabled={!user}
        >
          <Plus className="h-4 w-4" />
          <span>Add Opening</span>
        </Button>
      </div>

      {!user && (
  <div className="bg-warning/10 border border-warning text-black p-4 rounded-lg">
          Please sign in to manage your openings.
        </div>
      )}

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
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                  <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></span>
                </div>
              )}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(currentDate).map((date, index) => {
                  const openingCount = date ? getOpeningsForDate(date).length : 0;
                  return (
                    <div
                      key={index}
                      className={`p-2 h-12 flex flex-col items-center justify-center text-sm cursor-pointer rounded-lg transition-colors relative ${
                        !date
                          ? ''
                          : isToday(date)
                          ? 'bg-calendar-today text-primary-foreground font-bold'
                          : isSameDate(date, selectedDate)
                          ? 'bg-primary-light text-primary ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover:bg-secondary'
                      }`}
                      onClick={() => date && setSelectedDate(date)}
                    >
                      <span>{date?.getDate()}</span>
                      {/* Show indicator with count for dates with openings */}
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
                      <span className="font-medium">{opening.start_time} - {opening.end_time}</span>
                      <span className="text-xs">({opening.duration}h)</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOpening(opening.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      disabled={!user}
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
                      <span>${Number(getWorkerRate(opening.worker)) * Number(opening.duration)}</span>
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
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Opening for {selectedDate.toLocaleDateString()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={newOpening.multipleSlots} 
                onCheckedChange={(checked) => {
                  setNewOpening({...newOpening, multipleSlots: checked});
                  setErrors(prev => ({ ...prev, endTime: '' }));
                }}
              />
              <Label>Create multiple time slots</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Select 
                value={newOpening.startTime} 
                onValueChange={(value) => {
                  setNewOpening({...newOpening, startTime: value});
                  setErrors(prev => ({ ...prev, startTime: '' }));
                }}
              >
                <SelectTrigger className={errors.startTime ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select start time" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.startTime && <p className="text-sm text-destructive">{errors.startTime}</p>}
            </div>

            {newOpening.multipleSlots && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Select 
                    value={newOpening.endTime} 
                    onValueChange={(value) => {
                      setNewOpening({...newOpening, endTime: value});
                      setErrors(prev => ({ ...prev, endTime: '' }));
                    }}
                  >
                    <SelectTrigger className={errors.endTime ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
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
                      setNewOpening({...newOpening, interval: parseInt(value)});
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
            )}
            
            {!newOpening.multipleSlots && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select 
                  value={newOpening.duration.toString()} 
                  onValueChange={(value) => {
                    setNewOpening({...newOpening, duration: parseInt(value)});
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
            )}

            {isOrgMode ? (
              <div className="space-y-2">
                <Label htmlFor="worker">Worker</Label>
                <Select 
                  value={newOpening.worker} 
                  onValueChange={(value) => {
                    const skills = getWorkerSkills(value);
                    setNewOpening({...newOpening, worker: value, service: skills[0] || ''});
                    setErrors(prev => ({ ...prev, worker: '', service: '' }));
                  }}
                >
                  <SelectTrigger className={errors.worker ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workerData.map((w) => (
                      <SelectItem key={w.id} value={w.worker_name}>{w.worker_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.worker && <p className="text-sm text-destructive">{errors.worker}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Worker</Label>
                <Input value={selfWorkerName} disabled className="bg-muted" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Select 
                value={newOpening.service} 
                onValueChange={(value) => {
                  setNewOpening({...newOpening, service: value});
                  setErrors(prev => ({ ...prev, service: '' }));
                }}
              >
                <SelectTrigger className={errors.service ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {getWorkerSkills(isOrgMode ? newOpening.worker : selfWorkerName).map((skill) => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.service && <p className="text-sm text-destructive">{errors.service}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              {savedAddresses.length > 0 ? (
                <Select
                  value={newOpening.location}
                  onValueChange={(value) => setNewOpening({...newOpening, location: value === '__custom__' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a saved address or type custom" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedAddresses.map((addr: any) => (
                      <SelectItem key={addr.id} value={addr.address}>
                        {addr.label} — {addr.address}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom location...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="location"
                  placeholder="Enter location (optional)"
                  value={newOpening.location}
                  onChange={(e) => setNewOpening({...newOpening, location: e.target.value})}
                />
              )}
              {savedAddresses.length > 0 && newOpening.location === '' && (
                <Input
                  placeholder="Type custom location"
                  value={newOpening.location}
                  onChange={(e) => setNewOpening({...newOpening, location: e.target.value})}
                />
              )}
            </div>

            {newOpening.worker && (
              <div className="bg-secondary/30 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Rate Preview</div>
                <div className="font-medium">${Number(getWorkerRate(newOpening.worker))}/hour</div>
                {newOpening.multipleSlots ? (
                  <div className="text-sm">Each slot: ${Number(getWorkerRate(newOpening.worker)) * Number(newOpening.interval)}</div>
                ) : (
                  <div className="text-sm">Total: ${Number(getWorkerRate(newOpening.worker)) * Number(newOpening.duration)}</div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddOpening(false)}>
                Cancel
              </Button>
              <Button onClick={addOpening} disabled={loading || !user}>
                {loading ? 'Adding...' : 'Add Opening'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}