import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "./AddProjectDialog";

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

const statusConfig = {
  planning: { label: "Planejamento", color: "bg-primary/10 text-primary" },
  execution: { label: "Em Execução", color: "bg-accent/10 text-accent" },
  completed: { label: "Concluído", color: "bg-success/10 text-success" },
  onhold: { label: "Em Espera", color: "bg-warning/10 text-warning" },
  stopped: { label: "Parado", color: "bg-red-500/10 text-red-500" },
};

const ProjectCard = ({ project, onEdit, onDelete }: ProjectCardProps) => {
  const statusInfo = statusConfig[project.status as keyof typeof statusConfig];

  return (
    <Card className="p-6 hover:shadow-elegant transition-all duration-300 cursor-pointer group relative">
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-start justify-between mb-4 pr-8">
        <Badge className={statusInfo?.color}>{statusInfo?.label}</Badge>
        <span className="text-sm font-semibold text-success">{project.value}</span>
      </div>

      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
        {project.name}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{project.client}</p>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Gerente:</span>
          <span className="font-medium">{project.manager || "—"}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex flex-wrap gap-1.5">
        {project.type.split(",").filter(Boolean).map((t) => (
          <Badge key={t} variant="secondary">{t.trim()}</Badge>
        ))}
      </div>
    </Card>
  );
};

export default ProjectCard;
