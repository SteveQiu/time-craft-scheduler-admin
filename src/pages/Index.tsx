
import React from 'react';
import { Navigation } from '../components/ui/navigation';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-7xl mx-auto">
        {/* This page is now just a wrapper. See App.tsx for routing. */}
      </main>
    </div>
  );
};

export default Index;
