import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Filter, Grid, List, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddProjectDialog, { ProjectFormData } from "@/components/Projects/AddProjectDialog";
import ProjectCard from "@/components/Projects/ProjectCard";
import ProjectDetailView from "@/components/Projects/ProjectDetailView";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/types/project";

const Projects = () => {
  const location = useLocation();
  const { projects, loading, addProject, updateProject, deleteProject } = useProjects();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [initialFormData, setInitialFormData] = useState<ProjectFormData | null>(null);

  // Check if navigating from opportunity conversion
  useEffect(() => {
    if (location.state?.fromOpportunity) {
      setInitialFormData(location.state.fromOpportunity);
      setIsDialogOpen(true);
      // Clear the state to avoid reopening on subsequent renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleAddOrUpdateProject = async (project: Project) => {
    if (editingProject) {
      await updateProject(project);
    } else {
      await addProject(project);
    }
    setEditingProject(null);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setInitialFormData(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setInitialFormData(null);
      setEditingProject(null);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  if (selectedProject) {
    return (
      <ProjectDetailView
        project={selectedProject}
        onBack={() => setSelectedProject(null)}
        onEdit={(project) => {
          setEditingProject(project);
          setIsDialogOpen(true);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum projeto encontrado</p>
          <Button onClick={handleNewProject}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Projeto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} onClick={() => handleSelectProject(project)}>
              <ProjectCard
                project={project}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            </div>
          ))}
        </div>
      )}

      <AddProjectDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onAddProject={handleAddOrUpdateProject}
        editingProject={editingProject}
        initialData={initialFormData}
      />
    </div>
  );
};

export default Projects;
