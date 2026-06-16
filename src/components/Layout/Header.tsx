import { User, LogOut, Users, HardHat, TrendingUp, Target, FolderKanban, Package, Calendar, FileText, Settings, Building2, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { NotificationsDropdown } from "./NotificationsDropdown";

const PAGE_INFO: Record<string, { title: string; subtitle?: string; icon: React.ElementType }> = {
  "/dashboard/comercial": { title: "Dashboard Comercial", subtitle: "Pipeline de vendas, propostas e oportunidades", icon: TrendingUp },
  "/oportunidades": { title: "Oportunidades", subtitle: "Gerencie seu pipeline de vendas", icon: Target },
  "/dashboard/operacional": { title: "Dashboard Operacional", subtitle: "Visão geral das obras e execução em campo", icon: HardHat },
  "/projetos": { title: "Projetos", subtitle: "Gerencie todos os seus projetos", icon: FolderKanban },
  "/mapa": { title: "Mapa de Projetos", icon: Map },
  "/catalogo": { title: "Catálogo", subtitle: "Gerencie produtos e serviços", icon: Package },
  "/cronogramas": { title: "Cronogramas", subtitle: "Gantt · semáforo · caminho crítico · dependências", icon: Calendar },
  "/relatorios": { title: "Relatórios", subtitle: "Gere relatórios de progresso para clientes", icon: FileText },
  "/clientes": { title: "Clientes", subtitle: "Gerencie clientes e seus contratos de manutenção", icon: Building2 },
  "/usuarios": { title: "Usuários", subtitle: "Gerencie os usuários do sistema", icon: Users },
  "/configuracoes": { title: "Configurações", subtitle: "Gerencie as configurações da empresa e usuários do sistema", icon: Settings },
};

export const Header = () => {
  const { user, profile, isAdmin, signOut, isLoading } = useAuthContext();
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const pageInfo = PAGE_INFO[location.pathname];

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/login");
    }
  };

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <header
      className="fixed top-0 right-0 h-16 bg-card border-b border-border z-40 backdrop-blur-sm bg-card/80 transition-all duration-300"
      style={{ left: collapsed ? 64 : 256 }}
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Page title */}
        <div className="flex items-center gap-3 min-w-0">
          {pageInfo && (
            <>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <pageInfo.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-foreground leading-tight truncate">
                  {pageInfo.title}
                </h1>
                {pageInfo.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{pageInfo.subtitle}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <NotificationsDropdown />

          <div className="h-8 w-px bg-border" />

          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-medium">
                    {profile?.full_name || user.email?.split("@")[0] || "Usuário"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{profile?.full_name || "Usuário"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/usuarios")}>
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Usuários
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" className="gap-2" onClick={handleLoginClick}>
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-medium">Entrar</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
