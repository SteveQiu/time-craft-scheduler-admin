import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

// Eager — critical path
import NotFound from "./pages/NotFound";
import { RootRedirect } from "./pages/RootRedirect";
import Auth from "@/pages/Auth";
import { Dashboard } from "@/components/Dashboard";
import { AppSidebar } from "@/components/AppSidebar";
import { ROUTES } from "@/config/routes";
import { PageTitleProvider, usePageTitle } from "@/context/PageTitleContext";
import { ProfileBrandingProvider } from "@/context/ProfileBrandingContext";
import { useAuth } from "@/hooks/useAuth";
import { RealtimeInvalidator } from "@/components/RealtimeInvalidator";
import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";

// Lazy — loaded on first navigation
const Calendar = lazy(() => import("@/components/Calendar").then(m => ({ default: m.Calendar })));
const BookingBrowse = lazy(() => import("@/components/BookingBrowse").then(m => ({ default: m.BookingBrowse })));
const Resources = lazy(() => import("@/components/Resources").then(m => ({ default: m.Resources })));
const Appointments = lazy(() => import("@/components/Appointments").then(m => ({ default: m.Appointments })));
const AppointmentView = lazy(() => import("@/pages/AppointmentView").then(m => ({ default: m.AppointmentView })));
const OpeningView = lazy(() => import("@/pages/OpeningView").then(m => ({ default: m.OpeningView })));
const Settings = lazy(() => import("@/pages/Settings"));
const Profile = lazy(() => import("@/pages/Profile"));
const AdminReports = lazy(() => import("@/pages/AdminReports"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const Refund = lazy(() => import("@/pages/legal/Refund"));
const Help = lazy(() => import("@/pages/Help"));
const TestReminder = lazy(() => import("@/pages/dev/TestReminder"));
const SignUpConfirmation = lazy(() => import("@/pages/auth/SignUpConfirmation"));
const OpeningsListPage = lazy(() => import("@/pages/OpeningsListPage"));

const queryClient = new QueryClient();

function PaymentNotificationWatcher() {
  const { session } = useAuth();
  usePaymentNotifications({
    userId: session?.user?.id,
    role: 'provider',
    enabled: !!session?.user?.id,
  });
  return null;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        <Route path={ROUTES.openings} element={<Calendar />} />
        <Route path={ROUTES.openingsList} element={<OpeningsListPage />} />
        <Route path={ROUTES.calendar} element={<Navigate to={ROUTES.openings} replace />} />
        <Route path={ROUTES.browse} element={<BookingBrowse />} />
        <Route path={ROUTES.browseProvider} element={<BookingBrowse />} />
        <Route path={ROUTES.workers} element={<Resources />} />
        <Route path={ROUTES.appointments} element={<Appointments />} />
        <Route path={ROUTES.appointmentDetail} element={<AppointmentView />} />
        <Route path={ROUTES.openingDetail} element={<OpeningView />} />
        <Route path={ROUTES.auth} element={<Auth />} />
        <Route path={ROUTES.authConfirm} element={<SignUpConfirmation />} />
        <Route path={ROUTES.settings} element={<Settings />} />
        <Route path={ROUTES.profile} element={<Profile />} />
        <Route path={ROUTES.profileSlug} element={<Profile />} />
        <Route path={ROUTES.reports} element={<AdminReports />} />
        <Route path={ROUTES.notifications} element={<Notifications />} />
        <Route path={ROUTES.terms} element={<Terms />} />
        <Route path={ROUTES.privacy} element={<Privacy />} />
        <Route path={ROUTES.refund} element={<Refund />} />
        <Route path={ROUTES.help} element={<Help />} />
        {import.meta.env.DEV && <Route path="/test" element={<TestReminder />} />}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { title } = usePageTitle();

  return (
    <BrowserRouter>
      <PaymentNotificationWatcher />
      <RealtimeInvalidator />
      <div className="w-full h-screen flex flex-col">
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
            <h1 className="font-bold">{title}</h1>
            <div className="w-10" />
          </div>
        </header>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-[280px]">
            <AppSidebar />
          </SheetContent>
        </Sheet>

        <div className="hidden md:flex flex-1 overflow-hidden">
          <PanelGroup direction="horizontal" className="w-full h-full">
            <Panel defaultSize={20} minSize={10} maxSize={40} className="overflow-hidden">
              <AppSidebar />
            </Panel>
            <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize active:bg-primary" />
            <Panel defaultSize={80} className="flex flex-col overflow-hidden">
              <main className="flex-1 overflow-auto w-full bg-muted/50">
                <AppRoutes />
              </main>
            </Panel>
          </PanelGroup>
        </div>

        <main className="md:hidden flex-1 overflow-auto w-full bg-muted/50">
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PageTitleProvider>
          <ProfileBrandingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </TooltipProvider>
          </ProfileBrandingProvider>
        </PageTitleProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
