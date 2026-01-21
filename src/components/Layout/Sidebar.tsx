import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Target, 
  FolderKanban, 
  Package, 
  Calendar,
  FileText,
  Settings,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { LogoIcon } from "./LogoIcon";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Target, label: "Oportunidades", path: "/oportunidades" },
  { icon: FolderKanban, label: "Projetos", path: "/projetos" },
  { icon: Package, label: "Catálogo", path: "/catalogo" },
  { icon: Calendar, label: "Cronogramas", path: "/cronogramas" },
  { icon: FileText, label: "Relatórios", path: "/relatorios" },
];

export const Sidebar = () => {
  const location = useLocation();
  const { isAdmin, user } = useAuthContext();

  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ icon: Users, label: "Usuários", path: "/usuarios" }] : []),
  ];

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
      <nav className="flex-1 p-4 space-y-1">
        {allNavItems.map((item) => {
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
