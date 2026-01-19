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
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              className="w-6 h-6 text-primary-foreground"
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
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
      <div className="p-4 border-t border-sidebar-border">
        <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Configurações</span>
        </button>
      </div>
    </aside>
  );
};
