import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { Sidebar } from "@/components/Layout/Sidebar";
import { Header } from "@/components/Layout/Header";
import DashboardOperacional from "./pages/DashboardOperacional";
import DashboardComercial from "./pages/DashboardComercial";
import Mapa from "./pages/Mapa";
import Opportunities from "./pages/Opportunities";
import Projects from "./pages/Projects";
import Catalog from "./pages/Catalog";
import Schedules from "./pages/Schedules";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import Teams from "./pages/Teams";
import Audit from "./pages/Audit";
import PendingApproval from "./pages/PendingApproval";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, profile, allowedPages, isAdmin } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile && profile.approval_status !== 'approved') {
    return <PendingApproval />;
  }

  // Admins sempre têm acesso a todas as páginas (incluindo /auditoria)
  if (!isAdmin && allowedPages !== null && !allowedPages.includes(location.pathname)) {
    return <Navigate to="/dashboard/operacional" replace />;
  }

  return <>{children}</>;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { collapsed } = useSidebar();
  return (
    <div className="h-screen overflow-hidden bg-gradient-subtle">
      <Sidebar />
      <Header />
      <main
        className="h-screen overflow-auto pt-16 p-6 transition-all duration-300"
        style={{ marginLeft: collapsed ? 64 : 256 }}
      >
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

const AppRoutes = () => {
  const { user, isLoading } = useAuthContext();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isLoading ? (
            <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : user ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={<Navigate to="/dashboard/operacional" replace />}
      />
      <Route
        path="/dashboard/operacional"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardOperacional />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/comercial"
        element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardComercial />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mapa"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Mapa />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/oportunidades"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Opportunities />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projetos"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Projects />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/catalogo"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Catalog />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cronogramas"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Schedules />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Users />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Clients />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Teams />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/auditoria"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Audit />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <AppRoutes />
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
