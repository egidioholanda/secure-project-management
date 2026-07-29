import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Filter, Grid, List, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AddProjectDialog, { ProjectFormData } from "@/components/Projects/AddProjectDialog";
import ProjectCard from "@/components/Projects/ProjectCard";
import ProjectDetailView from "@/components/Projects/ProjectDetailView";
import { useProjects } from "@/hooks/useProjects";
import { useClientGroups } from "@/hooks/useClientGroups";
import { useAuthContext } from "@/contexts/AuthContext";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";
import { getProjectTypes } from "@/utils/projectTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "planning",  label: "Para Iniciar" },
  { value: "execution", label: "Em Execução" },
  { value: "completed", label: "Concluído" },
  { value: "onhold",    label: "Aguardando Material" },
  { value: "stopped",         label: "Parado" },
  { value: "started_stopped", label: "Iniciado/Parado" },
  { value: "obra_civil",      label: "Obra Civil" },
];

const ALL_STATUS_KEYS = STATUS_OPTIONS.map((s) => s.value);

// ─── List row ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  planning:  "bg-primary/10 text-primary",
  execution: "bg-accent/10 text-accent",
  completed: "bg-success/10 text-success",
  onhold:    "bg-warning/10 text-warning",
  stopped:   "bg-red-500/10 text-red-500",
};

function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
}

function formatValue(v: string) {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });
}

function ProjectListRow({
  project,
  onSelect,
  onEdit,
  onDelete,
}: {
  project: Project;
  onSelect: () => void;
  onEdit: (p: Project) => void;
  onDelete: (id: string) => void;
}) {
  const types = getProjectTypes(project.type);
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/30 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{project.name}</p>
        <p className="text-sm text-muted-foreground truncate">{project.client}</p>
      </div>
      <div className="hidden sm:flex gap-1 flex-wrap max-w-[180px]">
        {types.map((t) => (
          <Badge key={t} variant="secondary" className="text-xs whitespace-nowrap">{t}</Badge>
        ))}
      </div>
      <span className={cn("text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", STATUS_BADGE[project.status] ?? "bg-muted text-muted-foreground")}>
        {statusLabel(project.status)}
      </span>
      <span className="hidden md:block text-sm text-muted-foreground whitespace-nowrap">{project.manager}</span>
      <span className="text-sm font-semibold text-success whitespace-nowrap">{formatValue(project.value)}</span>
      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(project)}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(project.id)}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const Projects = () => {
  const location = useLocation();
  const { allowedClientIds, allowedClientGroupIds } = useAuthContext();
  const { projects, loading, addProject, updateProject, deleteProject } = useProjects(allowedClientIds, allowedClientGroupIds);
  const { groups: clientGroups } = useClientGroups();
  const visibleClientGroups = allowedClientGroupIds === null
    ? clientGroups
    : clientGroups.filter((g) => allowedClientGroupIds.includes(g.id));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [initialFormData, setInitialFormData] = useState<ProjectFormData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set(ALL_STATUS_KEYS));
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set<string>());
  const [activeClientGroups, setActiveClientGroups] = useState<Set<string>>(new Set<string>());

  // Collect all unique service types from projects
  const allTypes = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      getProjectTypes(p.type).forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [projects]);

  // Sync activeTypes when allTypes first loads
  useEffect(() => {
    setActiveTypes(new Set(allTypes));
  }, [allTypes.join(",")]);

  // Sync activeClientGroups when the visible group list first loads
  useEffect(() => {
    setActiveClientGroups(new Set(visibleClientGroups.map((g) => g.id)));
  }, [visibleClientGroups.map((g) => g.id).join(",")]);

  useEffect(() => {
    if (location.state?.fromOpportunity) {
      setInitialFormData(location.state.fromOpportunity);
      setIsDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.client.toLowerCase().includes(q)) return false;
      if (!activeStatuses.has(p.status)) return false;
      if (activeTypes.size > 0 && allTypes.length > 0) {
        const ptypes = getProjectTypes(p.type);
        if (ptypes.length > 0 && !ptypes.some((t) => activeTypes.has(t))) return false;
      }
      if (visibleClientGroups.length > 0 && p.clientGroupId && !activeClientGroups.has(p.clientGroupId)) {
        return false;
      }
      return true;
    });
  }, [projects, searchQuery, activeStatuses, activeTypes, allTypes, activeClientGroups, visibleClientGroups]);

  const hasActiveFilters =
    activeStatuses.size < ALL_STATUS_KEYS.length ||
    (allTypes.length > 0 && activeTypes.size < allTypes.length) ||
    (visibleClientGroups.length > 0 && activeClientGroups.size < visibleClientGroups.length);

  const toggleStatus = (key: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleType = (t: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const toggleClientGroup = (id: string) => {
    setActiveClientGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveStatuses(new Set(ALL_STATUS_KEYS));
    setActiveTypes(new Set(allTypes));
    setActiveClientGroups(new Set(visibleClientGroups.map((g) => g.id)));
    setSearchQuery("");
  };

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

  if (selectedProject) {
    return (
      <>
        <ProjectDetailView
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          onEdit={(project) => {
            setEditingProject(project);
            setIsDialogOpen(true);
          }}
        />
        <AddProjectDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          onAddProject={handleAddOrUpdateProject}
          editingProject={editingProject}
          initialData={initialFormData}
          existingProjects={projects}
        />
      </>
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projetos</h1>
          <p className="text-sm text-muted-foreground">Gerencie todos os seus projetos</p>
        </div>
        <Button
          onClick={handleNewProject}
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Search + toolbar */}
      <div className="flex flex-col gap-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por projeto ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter button + view toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(hasActiveFilters && "border-primary text-primary")}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">!</span>
              )}
            </Button>
            {(hasActiveFilters || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-8 px-2">
                <X className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {filteredProjects.length} de {projects.length} projetos
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-primary text-primary-foreground" : ""}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter panel */}
        {filterOpen && (
          <div className="border border-border rounded-lg p-4 bg-card space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => toggleStatus(s.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm border transition-colors",
                      activeStatuses.has(s.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {allTypes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Tipo de Serviço</p>
                <div className="flex flex-wrap gap-2">
                  {allTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleType(t)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm border transition-colors",
                        activeTypes.has(t)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {visibleClientGroups.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Grupo de Clientes</p>
                <div className="flex flex-wrap gap-2">
                  {visibleClientGroups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleClientGroup(g.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-sm border transition-colors",
                        activeClientGroups.has(g.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground"
                      )}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {projects.length === 0 ? "Nenhum projeto encontrado" : "Nenhum projeto corresponde aos filtros"}
          </p>
          {projects.length === 0 ? (
            <Button onClick={handleNewProject}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Projeto
            </Button>
          ) : (
            <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div key={project.id} onClick={() => setSelectedProject(project)}>
              <ProjectCard
                project={project}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredProjects.map((project) => (
            <ProjectListRow
              key={project.id}
              project={project}
              onSelect={() => setSelectedProject(project)}
              onEdit={handleEditProject}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}

      <AddProjectDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onAddProject={handleAddOrUpdateProject}
        editingProject={editingProject}
        initialData={initialFormData}
        existingProjects={projects}
      />
    </div>
  );
};

export default Projects;
