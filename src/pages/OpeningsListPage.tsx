import { useAuth } from '@/hooks/useAuth';
import { OpeningsListView } from '@/components/calendar/OpeningsListView';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarDays } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export function OpeningsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-3xl font-bold text-foreground">Openings List</h2>
        <Button variant="outline" onClick={() => navigate(ROUTES.openings)} className="gap-1.5">
          <CalendarDays className="h-4 w-4" />
          Calendar View
        </Button>
      </div>

      {!user ? (
        <div className="bg-warning/10 border border-warning text-black p-4 rounded-lg">
          Please sign in to manage your openings.
        </div>
      ) : (
        <OpeningsListView userId={user.id} />
      )}
    </div>
  );
}

export default OpeningsListPage;
