import { Search, Home, Calendar, Users, Clock, Settings, LogIn, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
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
  const { user } = useAuth();
  const { isUser, isOrganization, isInternalDev, loading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const { open } = useSidebar();
  const [viewMode, setViewMode] = useState<'user' | 'org'>('user');

  const userNavItems = [
    { id: 'browse', label: 'Browse', icon: Search, path: '/browse' },
    { id: 'appointments-user', label: 'My Appointments', icon: Clock, path: '/appointments' },
  ];

  const orgNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, path: '/dashboard' },
    { id: 'calendar', label: 'Opening Hours', icon: Calendar, path: '/calendar' },
    { id: 'workers', label: 'Workers', icon: Users, path: '/workers' },
    { id: 'appointments-org', label: 'Manage Appointments', icon: Clock, path: '/appointments' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

  // Show organization menu items based on role and view mode
  const showOrgSection = isInternalDev || isOrganization || (isOrganization && viewMode === 'org');
  const showUserSection = isInternalDev || isUser || (isOrganization && viewMode === 'user');

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
        {/* View Mode Switcher for Organizations */}
        {isOrganization && !isInternalDev && (
          <>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setViewMode(viewMode === 'user' ? 'org' : 'user')}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        <span>Switch to {viewMode === 'user' ? 'Organization' : 'User'} View</span>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <Separator className="my-2" />
          </>
        )}

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
            <Separator className="my-2" />
          </>
        )}

        {/* Account Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {user ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/settings')}>
                    <Link to="/settings" className="flex items-center">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/auth')}>
                    <Link to="/auth" className="flex items-center">
                      <LogIn className="h-4 w-4" />
                      <span>Sign In</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
