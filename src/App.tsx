import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

import NotFound from "./pages/NotFound";
import { Dashboard } from "@/components/Dashboard";
import { Calendar } from "@/components/Calendar";
import { BookingBrowse } from "@/components/BookingBrowse";
import { Workers } from "@/components/Workers";
import { Appointments } from "@/components/Appointments";
// Settings can be a placeholder for now
const Settings = () => (
  <div className="p-6">
    <h2 className="text-3xl font-bold text-foreground mb-4">Settings</h2>
    <p className="text-muted-foreground">Settings page coming soon.</p>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/browse" element={<BookingBrowse />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/settings" element={<Settings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
