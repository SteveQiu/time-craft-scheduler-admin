import React, { useState } from 'react';
import { Navigation } from '../components/ui/navigation';
import { Dashboard } from '../components/Dashboard';
import { Calendar } from '../components/Calendar';
import { BookingBrowse } from '../components/BookingBrowse';
import { Workers } from '../components/Workers';
import { Appointments } from '../components/Appointments';
import { SignInDialog } from '../components/SignInDialog';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [signInOpen, setSignInOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleTabChange = (tab: string) => {
    if (tab === 'signin') {
      setSignInOpen(true);
    } else {
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <Calendar />;
      case 'browse':
        return <BookingBrowse />;
      case 'workers':
        return <Workers />;
      case 'appointments':
        return <Appointments />;
      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-3xl font-bold text-foreground mb-4">Settings</h2>
            <div className="space-y-4">
              {user && (
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Signed in as:</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <Button onClick={signOut} variant="outline">
                    Sign Out
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground">More settings coming soon...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="max-w-7xl mx-auto">
        {renderContent()}
      </main>
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
    </div>
  );
};

export default Index;
