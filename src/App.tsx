import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import NotFound from "./pages/NotFound";
import { RootRedirect } from "./pages/RootRedirect";
import { Dashboard } from "@/components/Dashboard";
import { Calendar } from "@/components/Calendar";
import { BookingBrowse } from "@/components/BookingBrowse";
import { Workers } from "@/components/Workers";
import { Appointments } from "@/components/Appointments";
import { AppointmentView } from "@/pages/AppointmentView";
import { OpeningView } from "@/pages/OpeningView";
import Auth from "@/pages/Auth";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import AdminReports from "@/pages/AdminReports";
import Notifications from "@/pages/Notifications";

import { AppSidebar } from "@/components/AppSidebar";
import { APP_NAME } from "@/config/app";
import { ROUTES } from "@/config/routes";

const queryClient = new QueryClient();

const App = () => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="w-full h-screen flex flex-col">
              {/* Mobile header (hidden on desktop) */}
              <header className="md:hidden sticky top-0 z-50 bg-background border-b">
                <div className="flex items-center justify-between px-4 h-14">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSheetOpen(true)}
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                  <h1 className="font-bold">{APP_NAME}</h1>
                  <div className="w-10" /> {/* Spacer for centering */}
                </div>
              </header>

              {/* Mobile sidebar (Sheet) */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="left" className="p-0 w-[280px]">
                  <AppSidebar />
                </SheetContent>
              </Sheet>

              {/* Desktop layout */}
              <div className="hidden md:flex flex-1 overflow-hidden">
                <PanelGroup direction="horizontal" className="w-full h-full">
                  <Panel defaultSize={20} minSize={10} maxSize={40} className="overflow-hidden">
                    <AppSidebar />
                  </Panel>
                  <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize active:bg-primary" />
                  <Panel defaultSize={80} className="flex flex-col overflow-hidden">
                    <main className="flex-1 overflow-auto w-full">
                      <Routes>
                        <Route path="/" element={<RootRedirect />} />
                        <Route path={ROUTES.dashboard} element={<Dashboard />} />
                        <Route path={ROUTES.calendar} element={<Calendar />} />
                        <Route path={ROUTES.browse} element={<BookingBrowse />} />
                        <Route path={ROUTES.browseProvider} element={<BookingBrowse />} />
                        <Route path={ROUTES.workers} element={<Workers />} />
                        <Route path={ROUTES.appointments} element={<Appointments />} />
                        <Route path={ROUTES.appointmentDetail} element={<AppointmentView />} />
                        <Route path={ROUTES.openingDetail} element={<OpeningView />} />
                        <Route path={ROUTES.auth} element={<Auth />} />
                        <Route path={ROUTES.settings} element={<Settings />} />
                        <Route path={ROUTES.profile} element={<Profile />} />
                        <Route path={ROUTES.profileSlug} element={<Profile />} />
                        <Route path={ROUTES.reports} element={<AdminReports />} />
                        <Route path={ROUTES.notifications} element={<Notifications />} />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                  </Panel>
                </PanelGroup>
              </div>

              {/* Mobile content */}
              <main className="md:hidden flex-1 overflow-auto w-full">
                <Routes>
                  <Route path="/" element={<RootRedirect />} />
                  <Route path={ROUTES.dashboard} element={<Dashboard />} />
                  <Route path={ROUTES.calendar} element={<Calendar />} />
                  <Route path={ROUTES.browse} element={<BookingBrowse />} />
                  <Route path={ROUTES.browseProvider} element={<BookingBrowse />} />
                  <Route path={ROUTES.workers} element={<Workers />} />
                  <Route path={ROUTES.appointments} element={<Appointments />} />
                  <Route path={ROUTES.appointmentDetail} element={<AppointmentView />} />
                  <Route path={ROUTES.openingDetail} element={<OpeningView />} />
                  <Route path={ROUTES.auth} element={<Auth />} />
                  <Route path={ROUTES.settings} element={<Settings />} />
                  <Route path={ROUTES.profile} element={<Profile />} />
                  <Route path={ROUTES.profileSlug} element={<Profile />} />
                  <Route path={ROUTES.reports} element={<AdminReports />} />
                  <Route path={ROUTES.notifications} element={<Notifications />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
