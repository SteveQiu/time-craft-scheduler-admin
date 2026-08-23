import { Search, Home, Calendar as CalendarIcon, Users, Clock, Settings, LogIn, LogOut, UserCircle, Shield, Bell, HelpCircle, Crown } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';
import { useProfileBranding } from '@/context/ProfileBrandingContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useIsPremium } from '@/hooks/useIsPremium';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { isUser, isOrganization, isInternalDev, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const navigate = useNavigate();
  const { avatarUrl, providerName, isPremium: viewedPremium } = useProfileBranding();
  const isWhiteLabel = !!providerName;
  const { isPremium: ownPremium } = useIsPremium({ userId: user?.id });
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
    { id: 'browse', label: 'Browse', icon: Search, path: ROUTES.browse },
    { id: 'appointments-user', label: 'Reservations', icon: Clock, path: ROUTES.appointments },
    { id: 'openings', label: 'Opening', icon: CalendarIcon, path: ROUTES.openings },
  ];

  const orgNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: ROUTES.dashboard },
    { id: 'resources', label: 'Resources', icon: Users, path: ROUTES.workers },
    { id: 'openings', label: 'Opening', icon: CalendarIcon, path: ROUTES.openings },
    { id: 'appointments-org', label: 'Reservations', icon: Clock, path: ROUTES.appointments },
    { id: 'browse', label: 'Browse', icon: Search, path: ROUTES.browse },
  ];

  const isActive = (path: string) => {
    const [pathname, search] = path.split('?');
    const currentSearch = location.search;
    if (search) {
      return location.pathname === pathname && currentSearch === `?${search}`;
    }
    return location.pathname === pathname || (pathname === ROUTES.dashboard && location.pathname === '/');
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
      <div className="flex items-center space-x-3 px-4 py-3 border-b border-border min-h-[64px]">
        {isWhiteLabel ? (
          <>
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarImage src={avatarUrl ?? undefined} alt={providerName ?? 'Provider'} />
              <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                {(providerName || '?').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <h1 className={`truncate text-2xl font-bold leading-tight ${viewedPremium ? 'bg-gradient-to-r from-[#a16207] via-[#ca8a04] to-[#a16207] bg-clip-text text-transparent' : 'text-foreground'}`}>{providerName}</h1>
              <a
                href="https://pikappoint.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-[10px] leading-tight text-muted-foreground underline-offset-2 hover:underline"
              >
                Powered by {APP_NAME}
              </a>
            </div>
          </>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center space-x-3">
              <CalendarIcon className={`h-8 w-8 flex-shrink-0 ${ownPremium ? 'text-[#a16207]' : 'text-primary'}`} />
              <h1 className={`text-lg font-bold truncate ${ownPremium ? 'bg-gradient-to-r from-[#a16207] via-[#ca8a04] to-[#a16207] bg-clip-text text-transparent' : 'text-foreground'}`}>{APP_NAME}</h1>
            </div>
            {ownPremium && (
              <div className="flex items-center gap-1.5 mt-2 ml-11 border border-[#a16207]/30 rounded-lg px-2 py-0.5 w-fit">
                <Crown className="h-3.5 w-3.5 text-[#a16207]" />
                <span className="text-xs font-semibold text-[#a16207]">Premium</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 space-y-6">
        {/* User Section */}
        {showUserSection && (
          <>
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground px-4 mb-2">INDIVIDUAL</h3>
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
                to={ROUTES.browse}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(ROUTES.browse)
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
                to={ROUTES.notifications}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(ROUTES.notifications)
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
                to={ROUTES.profile}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(ROUTES.profile)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <UserCircle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{profileName || user?.email || 'My Profile'}</span>
              </Link>

              {isInternalDev && (
                <Link
                  to={ROUTES.reports}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive(ROUTES.reports)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent'
                  }`}
                >
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Report Queue</span>
                </Link>
              )}

              <Link
                to={ROUTES.settings}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(ROUTES.settings)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Settings</span>
              </Link>

              <Link
                to={ROUTES.help}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive(ROUTES.help)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <HelpCircle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Help</span>
              </Link>
            </div>

            {/* View Mode Switcher for Organizations */}
            {isOrganization && !isInternalDev && (
              <div className="flex items-center justify-center">
                <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as 'user' | 'org')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-11">
                    <TabsTrigger value="user" className="text-xs leading-none">Org</TabsTrigger>
                    <TabsTrigger value="org" className="text-xs leading-none">Individual</TabsTrigger>
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
            onClick={() => navigate(ROUTES.auth)}
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </Button>
        )}
      </div>
    </div>
  );
}
