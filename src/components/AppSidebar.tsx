import { Search, Home, Calendar as CalendarIcon, Users, Clock, Settings, LogIn, LogOut, User, Building2, Shield, UserCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { isUser, isOrganization, isInternalDev, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const { open } = useSidebar();
  const [viewMode, setViewMode] = useState<'user' | 'org'>('user');

  const userNavItems = [
    { id: 'browse', label: 'Browse', icon: Search, path: '/browse' },
    { id: 'my-openings', label: 'My Openings', icon: CalendarIcon, path: '/calendar?mode=user' },
    { id: 'appointments-user', label: 'My Appointments', icon: Clock, path: '/appointments?mode=user' },
  ];

  const orgNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'calendar', label: 'Opening', icon: CalendarIcon, path: '/calendar?mode=org' },
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

  // Show sections based on role and view mode
  const showOrgSection = isInternalDev || (isOrganization && viewMode === 'user');
  const showUserSection = isInternalDev || isUser || (isOrganization && viewMode === 'org');

  if (rolesLoading) {
    return (
      <Sidebar className="border-r border-border">
        <SidebarContent className="flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="border-r border-border">
      <SidebarContent>
        {/* Logo at the top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex items-center space-x-2 px-4 py-3">
              <CalendarIcon className="h-8 w-8 text-primary" />
              {open && <h1 className="text-xl font-bold text-foreground">AppointmentPro</h1>}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator className="my-2" />

        {/* User Section */}
        {showUserSection && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
                USER
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {userNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.path} className="flex items-center">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <Separator className="my-2" />
          </>
        )}

        {/* Organization Section */}
        {showOrgSection && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
                ORGANIZATION
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {orgNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.path} className="flex items-center">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Sign In for unauthenticated */}
        {!user && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/auth')}>
                    <Link to="/auth" className="flex items-center">
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        {/* Account Section */}
        {user && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/profile')}>
                  <Link to="/profile" className="flex items-center">
                    <UserCircle className="h-4 w-4" />
                    <span>{user?.user_metadata?.full_name || user?.email || 'My Profile'}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isInternalDev && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/reports')}>
                    <Link to="/reports" className="flex items-center">
                      <Shield className="h-4 w-4" />
                      <span>Report Queue</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/settings')}>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <Separator />
          </>
        )}
        {/* View Mode Switcher for Organizations */}
        {isOrganization && !isInternalDev && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setViewMode(viewMode === 'user' ? 'org' : 'user')}
                  className="flex items-center gap-2"
                >
                  {viewMode === 'org' ? (
                    <>
                      <Building2 className="h-4 w-4" />
                      <span>I am Organization</span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      <span>I am User</span>
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <Separator />
          </>
        )}

        {/* Sign Out - always last */}
        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => signOut()}
                className="flex items-center text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
