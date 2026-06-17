import { Link, useLocation } from "react-router-dom";
import {
  HardHat, TrendingUp, Target, FolderKanban, Package,
  Calendar, FileText, Settings, Users, Building2, Map,
  ChevronLeft, ChevronRight, UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { LogoIcon } from "./LogoIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const commercialItems = [
  { icon: TrendingUp,   label: "Dashboard Comercial",  path: "/dashboard/comercial" },
  { icon: Target,       label: "Oportunidades",         path: "/oportunidades" },
];

const operationalItems = [
  { icon: HardHat,      label: "Dashboard Operacional", path: "/dashboard/operacional" },
  { icon: FolderKanban, label: "Projetos",              path: "/projetos" },
  { icon: Map,          label: "Mapa",                  path: "/mapa" },
  { icon: Package,      label: "Catálogo",              path: "/catalogo" },
  { icon: Calendar,     label: "Cronogramas",           path: "/cronogramas" },
  { icon: UsersRound,   label: "Equipes",               path: "/equipes" },
  { icon: FileText,     label: "Relatórios",            path: "/relatorios" },
  { icon: Building2,    label: "Clientes",              path: "/clientes" },
];

const SUP_TECNICO_PATHS = [
  "/dashboard/operacional", "/projetos", "/mapa",
  "/catalogo", "/cronogramas", "/equipes", "/relatorios", "/clientes",
];

function NavItem({
  path,
  label,
  icon: Icon,
  collapsed,
}: {
  path: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
}) {
  const { pathname } = useLocation();
  const isActive = pathname === path;

  const link = (
    <Link
      to={path}
      className={cn(
        "flex items-center rounded-lg transition-all duration-150",
        collapsed ? "justify-center p-3 w-full" : "gap-3 px-3 py-2.5 w-full",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span className="font-medium text-sm truncate">{label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const { isAdmin, isSupTecnico } = useAuthContext();
  const { collapsed, toggle } = useSidebar();

  const showCommercial = !isSupTecnico || isAdmin;
  const filteredOp = isSupTecnico && !isAdmin
    ? operationalItems.filter((i) => SUP_TECNICO_PATHS.includes(i.path))
    : operationalItems;

  return (
    <aside
      style={{ width: collapsed ? 64 : 256 }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 transition-[width] duration-300 ease-in-out"
    >
      {/* ── Logo + toggle ── */}
      <div className="h-16 flex items-center flex-shrink-0 border-b border-sidebar-border px-2 gap-1">
        {collapsed ? (
          /* Collapsed: just the toggle acting as expand button */
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggle}
                className="flex items-center justify-center w-full h-10 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expandir menu</TooltipContent>
          </Tooltip>
        ) : (
          /* Expanded: logo + title + collapse button */
          <>
            <LogoIcon className="w-8 h-8 flex-shrink-0 ml-1" />
            <div className="flex-1 min-w-0 ml-2">
              <p className="text-sm font-bold text-sidebar-foreground leading-tight truncate">SecureProject</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">Gestão Inteligente</p>
            </div>
            <button
              onClick={toggle}
              title="Recolher menu"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
        {showCommercial && (
          <div className="mb-3">
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 pb-1">
                Comercial
              </p>
            )}
            <div className="space-y-0.5">
              {commercialItems.map((item) => (
                <NavItem key={item.path} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        )}

        <div>
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 pb-1">
              Operacional
            </p>
          )}
          <div className="space-y-0.5">
            {filteredOp.map((item) => (
              <NavItem key={item.path} {...item} collapsed={collapsed} />
            ))}
            {isAdmin && (
              <NavItem path="/usuarios" label="Usuários" icon={Users} collapsed={collapsed} />
            )}
          </div>
        </div>
      </nav>

      {/* ── Configurações (admin) ── */}
      {isAdmin && (
        <div className="border-t border-sidebar-border p-2 flex-shrink-0">
          <NavItem path="/configuracoes" label="Configurações" icon={Settings} collapsed={collapsed} />
        </div>
      )}
    </aside>
  );
}
