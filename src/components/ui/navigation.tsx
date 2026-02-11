import React from 'react';
import { SidebarTrigger } from './sidebar';

export function Navigation() {
  return (
    <nav className="bg-card border-b border-border px-4 py-2">
      <SidebarTrigger />
    </nav>
  );
}
