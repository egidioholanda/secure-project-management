import { useState } from "react";
import { Plus, Filter, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddProjectDialog, { Project } from "@/components/Projects/AddProjectDialog";
import ProjectCard from "@/components/Projects/ProjectCard";
import { toast } from "sonner";

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: "1",
      name: "Shopping Center Norte - CFTV",
      client: "Shopping Center Norte",
      type: "CFTV",
      status: "execution",
      progress: 75,
      startDate: "01/03/2024",
      endDate: "30/06/2024",
      manager: "João Silva",
      value: "R$ 180.000",
    },
    {
      id: "2",
      name: "Condomínio Residencial - Controle Acesso",
      client: "Condomínio Portal das Águas",
      type: "Controle de Acesso",
      status: "execution",
      progress: 45,
      startDate: "15/03/2024",
      endDate: "15/07/2024",
      manager: "Maria Santos",
      value: "R$ 95.000",
    },
    {
      id: "3",
      name: "Fábrica Industrial - Alarme Perimetral",
      client: "Indústria Forte LTDA",
      type: "Alarme Perimetral",
      status: "planning",
      progress: 20,
      startDate: "20/04/2024",
      endDate: "20/08/2024",
      manager: "Carlos Mendes",
      value: "R$ 220.000",
    },
    {
      id: "4",
      name: "Hospital São Lucas - Sistema Integrado",
      client: "Hospital São Lucas",
      type: "Sistema Integrado",
      status: "completed",
      progress: 100,
      startDate: "01/01/2024",
      endDate: "31/03/2024",
      manager: "Ana Paula",
      value: "R$ 450.000",
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const handleAddOrUpdateProject = (project: Project) => {
    if (editingProject) {
      setProjects(projects.map((p) => (p.id === project.id ? project : p)));
    } else {
      setProjects([...projects, project]);
    }
    setEditingProject(null);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter((p) => p.id !== projectId));
    toast.success("Projeto excluído com sucesso!");
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Projetos</h1>
          <p className="text-muted-foreground">Gerencie todos os seus projetos</p>
        </div>
        <Button 
          onClick={handleNewProject}
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Filters & View */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Grid className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onEdit={handleEditProject}
            onDelete={handleDeleteProject}
          />
        ))}
      </div>

      <AddProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAddProject={handleAddOrUpdateProject}
        editingProject={editingProject}
      />
    </div>
  );
};

export default Projects;
