import React, { useState } from 'react';
import { Navigation } from '../components/ui/navigation';
import { Dashboard } from '../components/Dashboard';
import { Calendar } from '../components/Calendar';
import { Workers } from '../components/Workers';
import { Appointments } from '../components/Appointments';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <Calendar />;
      case 'workers':
        return <Workers />;
      case 'appointments':
        return <Appointments />;
      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-foreground mb-4">Settings</h2>
            <p className="text-muted-foreground">Settings panel coming soon...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
