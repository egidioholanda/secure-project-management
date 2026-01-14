import { useState, useEffect } from "react";
import { ArrowLeft, Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Project, PlacedDevice, Proposal } from "@/types/project";
import FloorPlanEditor from "./FloorPlanEditor";
import ProposalEditor from "./ProposalEditor";
import { supabase } from "@/integrations/supabase/client";

interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onEdit: (project: Project) => void;
}

const statusConfig = {
  planning: { label: "Planejamento", color: "bg-primary/10 text-primary" },
  execution: { label: "Em Execução", color: "bg-accent/10 text-accent" },
  completed: { label: "Concluído", color: "bg-success/10 text-success" },
  onhold: { label: "Em Espera", color: "bg-warning/10 text-warning" },
};

const ProjectDetailView = ({ project, onBack, onEdit }: ProjectDetailViewProps) => {
  const [view, setView] = useState<"editor" | "proposal">("editor");
  const [placedDevices, setPlacedDevices] = useState<PlacedDevice[]>([]);
  const [existingProposal, setExistingProposal] = useState<Proposal | null>(null);
  const [loadingProposal, setLoadingProposal] = useState(true);

  const statusInfo = statusConfig[project.status as keyof typeof statusConfig];

  useEffect(() => {
    checkExistingProposal();
  }, [project.id]);

  const checkExistingProposal = async () => {
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setExistingProposal(data as Proposal | null);
    } catch (error) {
      console.error("Error checking proposal:", error);
    } finally {
      setLoadingProposal(false);
    }
  };

  const handleGenerateProposal = (devices: PlacedDevice[]) => {
    setPlacedDevices(devices);
    setView("proposal");
  };

  const handleViewExistingProposal = () => {
    setPlacedDevices([]);
    setView("proposal");
  };

  if (view === "proposal") {
    return (
      <ProposalEditor
        project={project}
        placedDevices={placedDevices}
        onBack={() => {
          setView("editor");
          checkExistingProposal();
        }}
        existingProposalId={existingProposal?.id && placedDevices.length === 0 ? existingProposal.id : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={statusInfo?.color}>{statusInfo?.label}</Badge>
            </div>
            <p className="text-muted-foreground">{project.client}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loadingProposal && existingProposal && (
            <Button
              variant="outline"
              onClick={handleViewExistingProposal}
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Proposta
            </Button>
          )}
          <Button variant="outline" onClick={() => onEdit(project)}>
            <Pencil className="w-4 h-4 mr-2" />
            Editar Projeto
          </Button>
        </div>
      </div>

      {/* Informações do Projeto */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Tipo</p>
          <p className="font-medium">{project.type}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Gerente</p>
          <p className="font-medium">{project.manager || "-"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Período</p>
          <p className="font-medium">
            {project.startDate} - {project.endDate}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valor</p>
          <p className="font-medium text-success">{project.value}</p>
        </div>
      </div>

      {/* Editor de Planta */}
      <FloorPlanEditor
        projectId={project.id}
        projectName={project.name}
        onGenerateProposal={handleGenerateProposal}
      />
    </div>
  );
};

export default ProjectDetailView;