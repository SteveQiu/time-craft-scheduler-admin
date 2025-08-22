import React from 'react';
import { Calendar, Users, Settings, Home, Clock, Search, LogIn } from 'lucide-react';
import { Button } from './button';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const { user } = useAuth();
  
  const navItems = [
    { id: 'browse', label: 'Browse', icon: Search, path: '/browse' },
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'calendar', label: 'Opening', icon: Calendar, path: '/calendar' },
    { id: 'workers', label: 'Workers', icon: Users, path: '/workers' },
    { id: 'appointments', label: 'Appointments', icon: Clock, path: '/appointments' },
    ...(user 
      ? [{ id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }]
      : [{ id: 'signin', label: 'Sign In', icon: LogIn, path: '/signin' }]
    ),
  ];
  const location = useLocation();

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
            // Highlight if current path matches item's path (or root for dashboard)
            const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
            return (
              <Button
                key={item.id}
                asChild
                variant={isActive ? "default" : "ghost"}
                className="flex items-center space-x-2"
              >
                <Link to={item.path}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}