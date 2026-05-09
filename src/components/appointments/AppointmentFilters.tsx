import React from 'react';
import { Search, Filter, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateFilter } from './calendarExport';

interface AppointmentFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  workerFilter: string;
  setWorkerFilter: (v: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  isOrgView: boolean;
  workers: { id: string; worker_name: string }[];
  onFilterChange: () => void;
}

export function AppointmentFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  workerFilter,
  setWorkerFilter,
  dateFilter,
  setDateFilter,
  isOrgView,
  workers,
  onFilterChange,
}: AppointmentFiltersProps) {
  return (
    <Card className="shadow-soft border-card-border">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search appointments..."
              aria-label="Search appointments"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); onFilterChange(); }}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); onFilterChange(); }}>
            <SelectTrigger className="w-full sm:w-48">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {isOrgView && (
            <Select value={workerFilter} onValueChange={(v) => { setWorkerFilter(v); onFilterChange(); }}>
              <SelectTrigger className="w-full sm:w-48">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <SelectValue placeholder="Filter by worker" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workers</SelectItem>
                {workers.map(w => (
                  <SelectItem key={w.id} value={w.worker_name}>{w.worker_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div role="group" aria-label="Date filter" className="flex flex-wrap gap-2 mt-3">
          {(['all', 'today', 'week', 'month'] as DateFilter[]).map(f => (
            <Button
              key={f}
              variant={dateFilter === f ? 'default' : 'outline'}
              size="sm"
              aria-pressed={dateFilter === f}
              onClick={() => setDateFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'today' ? 'Today' : f === 'week' ? 'This Week' : 'This Month'}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
