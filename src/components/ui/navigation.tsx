import React from 'react';
import { Calendar, Users, Settings, Home, Clock, Search } from 'lucide-react';
import { Button } from './button';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const navItems = [
    { id: 'browse', label: 'Browse', icon: Search },
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'calendar', label: 'Opening', icon: Calendar },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'appointments', label: 'Appointments', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-card border-b border-card-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">AppointmentPro</h1>
        </div>
        
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "default" : "ghost"}
                onClick={() => onTabChange(item.id)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}