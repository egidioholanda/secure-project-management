import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/project";
import { toast } from "sonner";

interface DbProject {
  id: string;
  name: string;
  client: string;
  type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  manager: string | null;
  value: string | null;
  description: string | null;
  opportunity_id: string | null;
  client_id: string | null;
  client_group_id: string | null;
  created_at: string;
  updated_at: string;
}

const formatDateForDisplay = (date: string | null): string => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR");
};

const parseDateFromDisplay = (dateStr: string): string | null => {
  if (!dateStr) return null;
  // Try to parse DD/MM/YYYY format
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // If it's already in ISO format, return as is
  if (dateStr.includes("-")) {
    return dateStr;
  }
  return null;
};

const mapDbToProject = (db: DbProject): Project => ({
  id: db.id,
  name: db.name,
  client: db.client,
  type: db.type,
  status: db.status,
  startDate: formatDateForDisplay(db.start_date),
  endDate: formatDateForDisplay(db.end_date),
  manager: db.manager || "",
  value: db.value || "",
  address: db.description || "",
  opportunityId: db.opportunity_id || undefined,
  clientId: db.client_id,
  clientGroupId: db.client_group_id,
  createdAt: db.created_at,
});

export const linkProjectToClient = async (projectId: string, clientId: string | null) => {
  const { error } = await supabase.from("projects").update({ client_id: clientId }).eq("id", projectId);
  if (error) throw error;
};

export const useProjects = (allowedClientIds?: string[] | null, allowedClientGroupIds?: string[] | null) => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const projects = useMemo(() => {
    // null = admin/unrestricted → show everything
    if (allowedClientIds === null || allowedClientIds === undefined) return allProjects;
    return allProjects.filter((p) => {
      // Tem cliente vinculado → filtra por clientId
      if (p.clientId) return allowedClientIds.includes(p.clientId);
      // Sem cliente mas tem grupo → filtra por grupo
      if (p.clientGroupId && allowedClientGroupIds != null) {
        return allowedClientGroupIds.includes(p.clientGroupId);
      }
      // Sem cliente e sem grupo → oculta para usuários restritos
      return false;
    });
  }, [allProjects, allowedClientIds, allowedClientGroupIds]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllProjects((data || []).map(mapDbToProject));
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Erro ao carregar projetos");
    } finally {
      setLoading(false);
    }
  };

  const addProject = async (project: Omit<Project, "id"> & { id?: string; opportunityId?: string }) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: project.name,
          client: project.client,
          type: project.type,
          status: project.status,
          start_date: parseDateFromDisplay(project.startDate),
          end_date: parseDateFromDisplay(project.endDate),
          manager: project.manager || null,
          value: project.value || null,
          description: project.address || null,
          opportunity_id: project.opportunityId || null,
          client_group_id: project.clientGroupId || null,
        })
        .select()
        .single();

      if (error) throw error;
      const newProject = mapDbToProject(data);
      setAllProjects((prev) => [newProject, ...prev]);
      toast.success("Projeto criado com sucesso!");
      return newProject;
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error("Erro ao criar projeto");
      return null;
    }
  };

  const updateProject = async (project: Project) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: project.name,
          client: project.client,
          type: project.type,
          status: project.status,
          start_date: parseDateFromDisplay(project.startDate),
          end_date: parseDateFromDisplay(project.endDate),
          manager: project.manager || null,
          value: project.value || null,
          description: project.address || null,
          client_group_id: project.clientGroupId || null,
        })
        .eq("id", project.id);

      if (error) throw error;
      setAllProjects((prev) =>
        prev.map((p) => (p.id === project.id ? project : p))
      );
      toast.success("Projeto atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Erro ao atualizar projeto");
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      setAllProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Projeto excluído com sucesso!");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Erro ao excluir projeto");
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};
