import { Search, Home, Calendar as CalendarIcon, Users, Clock, Settings, LogIn, LogOut, UserCircle, Shield, Bell } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { isUser, isOrganization, isInternalDev, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'user' | 'org'>('user');
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setProfileName(null); return; }
    supabase.from('profiles').select('full_name').eq('id', user.id).single()
      .then(({ data }) => setProfileName(data?.full_name || null));
  }, [user]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_unread_notification_count');
      if (error) return 0;
      return (data as number) || 0;
    },
    enabled: !!user,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const userNavItems = [
    { id: 'browse', label: 'Browse', icon: Search, path: '/browse' },
    { id: 'openings', label: 'Opening', icon: CalendarIcon, path: '/calendar' },
    { id: 'appointments-user', label: 'Reservations', icon: Clock, path: '/appointments' },
  ];

  const orgNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'openings', label: 'Opening', icon: CalendarIcon, path: '/calendar?mode=org' },
    { id: 'workers', label: 'Workers', icon: Users, path: '/workers' },
    { id: 'appointments-org', label: 'Reservations', icon: Clock, path: '/appointments?mode=org' },
  ];

  const isActive = (path: string) => {
    const [pathname, search] = path.split('?');
    const currentSearch = location.search;
    if (search) {
      return location.pathname === pathname && currentSearch === `?${search}`;
    }
    return location.pathname === pathname || (pathname === '/dashboard' && location.pathname === '/');
  };

  const showOrgSection = isInternalDev || (isOrganization && viewMode === 'user');
  const showUserSection = isInternalDev || isUser || (isOrganization && viewMode === 'org');

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground bg-sidebar border-r border-border">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border overflow-hidden">
      {/* Logo */}
      <div className="flex items-center space-x-2 px-4 py-3 border-b border-border">
        <CalendarIcon className="h-8 w-8 text-primary flex-shrink-0" />
        <h1 className="text-lg font-bold text-foreground truncate">{APP_NAME}</h1>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* User Section */}
        {showUserSection && (
          <>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground px-4 mb-2">USER</h3>
              <div className="space-y-1 px-2">
                {userNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <Separator className="my-2" />
          </>
        )}

        {/* Org Section */}
        {showOrgSection && (
          <>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground px-4 mb-2">ORGANIZATION</h3>
              <div className="space-y-1 px-2">
                {orgNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Guest Section (unauthenticated) */}
        {!user && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground px-4 mb-2">BROWSE</h3>
            <div className="space-y-1 px-2">
              <Link
                to="/browse"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive('/browse')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Search className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Browse</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Footer */}
      <div className="p-4 space-y-2">
        {user && (
          <>
            {/* Profile and Settings */}
            <div className="space-y-1">
              <Link
                to="/notifications"
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive('/notifications')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Bell className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Notifications</span>
                </span>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Link>

              <Link
                to="/profile"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <UserCircle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{profileName || user?.email || 'My Profile'}</span>
              </Link>

              {isInternalDev && (
                <Link
                  to="/reports"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive('/reports')
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Report Queue</span>
                </Link>
              )}

              <Link
                to="/settings"
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive('/settings')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Settings</span>
              </Link>
            </div>

            <Separator />

            {/* View Mode Switcher for Organizations */}
            {isOrganization && !isInternalDev && (
              <div className="flex items-center justify-center">
                <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'user' | 'org')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-11">
                    <TabsTrigger value="user" className="text-xs leading-none">Org</TabsTrigger>
                    <TabsTrigger value="org" className="text-xs leading-none">User</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            <Button
              variant="outline"
              onClick={signOut}
              className="w-full gap-2 justify-center"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </>
        )}
        {!user && (
          <Button 
            className="w-full gap-2 justify-start"
            onClick={() => navigate('/auth')}
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </Button>
        )}
      </div>
    </div>
  );
}
