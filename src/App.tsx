import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import HostAuth from "./pages/HostAuth";
import ClientAuth from "./pages/ClientAuth";
import HostDashboard from "./pages/HostDashboard";
import HostDashboardNew from "./pages/HostDashboardNew";
import ClientDashboard from "./pages/ClientDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/host-auth" element={<HostAuth />} />
          <Route path="/client-auth" element={<ClientAuth />} />
          <Route path="/host-dashboard" element={<HostDashboard />} />
          <Route path="/host" element={<HostDashboardNew />} />
          <Route path="/client-dashboard" element={<ClientDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
