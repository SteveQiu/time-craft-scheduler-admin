import React from 'react';
import { Calendar, Users, Settings, Home, Clock, Search, LogIn } from 'lucide-react';
import { Button } from './button';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const { user } = useAuth();
  
  const userNavItems = [
    { id: 'browse', label: 'Browse', icon: Search, path: '/browse' },
    { id: 'appointments-user', label: 'Appointments', icon: Clock, path: '/appointments' },
  ];

  const orgNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'calendar', label: 'Opening', icon: Calendar, path: '/calendar' },
    { id: 'workers', label: 'Workers', icon: Users, path: '/workers' },
    { id: 'appointments-org', label: 'Appointments', icon: Clock, path: '/appointments' },
  ];

  const accountNavItems = user 
    ? [{ id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }]
    : [{ id: 'signin', label: 'Sign In', icon: LogIn, path: '/signin' }];

  const location = useLocation();

  return (
    <nav className="bg-card border-b border-card-border px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">AppointmentPro</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* User Section */}
          <div className="flex items-center space-x-1">
            <span className="text-xs font-semibold text-muted-foreground mr-2">USER</span>
            {userNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
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

          {/* Separator */}
          <div className="h-8 w-px bg-border" />

          {/* Organization Section */}
          <div className="flex items-center space-x-1">
            <span className="text-xs font-semibold text-muted-foreground mr-2">ORGANIZATION</span>
            {orgNavItems.map((item) => {
              const Icon = item.icon;
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

          {/* Separator */}
          <div className="h-8 w-px bg-border" />

          {/* Account Section */}
          <div className="flex items-center space-x-1">
            {accountNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
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
      </div>
    </nav>
  );
}