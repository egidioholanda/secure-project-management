import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import Dashboard from "./pages/Dashboard";
import Opportunities from "./pages/Opportunities";
import Projects from "./pages/Projects";
import Catalog from "./pages/Catalog";
import Schedules from "./pages/Schedules";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-subtle">
          <Sidebar />
          <Header />
          <main className="ml-64 pt-16 p-6">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/oportunidades" element={<Opportunities />} />
                <Route path="/projetos" element={<Projects />} />
                <Route path="/catalogo" element={<Catalog />} />
                <Route path="/cronogramas" element={<Schedules />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
