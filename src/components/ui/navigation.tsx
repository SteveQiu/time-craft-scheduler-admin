import React from 'react';
import { Calendar } from 'lucide-react';
import { SidebarTrigger } from './sidebar';

export function Navigation() {
  return (
    <nav className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SidebarTrigger />
          <div className="flex items-center space-x-2">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">AppointmentPro</h1>
          </div>
        </div>
      </div>
    </nav>
  );
}