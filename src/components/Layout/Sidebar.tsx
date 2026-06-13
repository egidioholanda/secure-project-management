import { Link, useLocation } from "react-router-dom";
import {
  HardHat,
  TrendingUp,
  Target,
  FolderKanban,
  Package,
  Calendar,
  FileText,
  Settings,
  Users,
  Building2,
  Map,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { LogoIcon } from "./LogoIcon";

const commercialItems = [
  { icon: TrendingUp, label: "Dashboard Comercial", path: "/dashboard/comercial" },
  { icon: Target, label: "Oportunidades", path: "/oportunidades" },
];

const operationalItems = [
  { icon: HardHat, label: "Dashboard Operacional", path: "/dashboard/operacional" },
  { icon: FolderKanban, label: "Projetos", path: "/projetos" },
  { icon: Map, label: "Mapa", path: "/mapa" },
  { icon: Package, label: "Catálogo", path: "/catalogo" },
  { icon: Calendar, label: "Cronogramas", path: "/cronogramas" },
  { icon: FileText, label: "Relatórios", path: "/relatorios" },
  { icon: Building2, label: "Clientes", path: "/clientes" },
];

const SUP_TECNICO_PATHS = [
  "/dashboard/operacional",
  "/projetos",
  "/mapa",
  "/catalogo",
  "/cronogramas",
  "/relatorios",
  "/clientes",
];

export const Sidebar = () => {
  const location = useLocation();
  const { isAdmin, isSupTecnico } = useAuthContext();

  const showCommercial = !isSupTecnico || isAdmin;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <LogoIcon className="w-10 h-10" />
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">SecureProject</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão Inteligente</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {showCommercial && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-4 mb-1">
              Comercial
            </p>
            <div className="space-y-1 mb-3">
              {commercialItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                      "hover:bg-sidebar-accent hover:translate-x-1",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                        : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-4 mb-1">
          Operacional
        </p>
        <div className="space-y-1">
          {operationalItems
            .filter((i) =>
              isSupTecnico && !isAdmin ? SUP_TECNICO_PATHS.includes(i.path) : true
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    "hover:bg-sidebar-accent hover:translate-x-1",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                      : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          {isAdmin && (
            <Link
              to="/usuarios"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                "hover:bg-sidebar-accent hover:translate-x-1",
                location.pathname === "/usuarios"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
              )}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Usuários</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Footer */}
      {isAdmin && (
        <div className="p-4 border-t border-sidebar-border">
          <Link
            to="/configuracoes"
            className={cn(
              "flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all duration-200",
              "hover:bg-sidebar-accent hover:translate-x-1",
              location.pathname === "/configuracoes"
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant"
                : "text-sidebar-foreground hover:text-sidebar-accent-foreground"
            )}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Configurações</span>
          </Link>
        </div>
      )}
    </aside>
  );
};
