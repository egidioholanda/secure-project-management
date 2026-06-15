import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/schedule";
import { toast } from "sonner";

interface DbTask {
  id: string;
  name: string;
  project_id: string | null;
  project_name: string | null;
  start_date: string;
  end_date: string;
  progress: number;
  assignee: string | null;
  color: string | null;
  dependencies?: string[] | null;
  created_at: string;
  updated_at: string;
}

const mapDbToTask = (db: DbTask): Task => ({
  id: db.id,
  name: db.name,
  projectId: db.project_id || "",
  projectName: db.project_name || "",
  startDate: new Date(db.start_date),
  endDate: new Date(db.end_date),
  progress: db.progress,
  assignee: db.assignee || "",
  color: db.color || "#3B82F6",
  dependencies: Array.isArray(db.dependencies) ? db.dependencies : [],
});

const formatDateForDb = (date: Date): string => date.toISOString().split("T")[0];

const taskToDbPayload = (task: Task) => ({
  name: task.name,
  project_id: task.projectId || null,
  project_name: task.projectName || null,
  start_date: formatDateForDb(task.startDate),
  end_date: formatDateForDb(task.endDate),
  progress: task.progress,
  assignee: task.assignee || null,
  color: task.color || "#3B82F6",
  dependencies: task.dependencies || [],
});

export const useScheduleTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("schedule_tasks")
        .select("*")
        .order("start_date", { ascending: true });

      if (error) throw error;
      setTasks((data || []).map((d) => mapDbToTask(d as DbTask)));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (task: Omit<Task, "id">): Promise<Task | null> => {
    try {
      const { data, error } = await supabase
        .from("schedule_tasks")
        .insert(taskToDbPayload({ ...task, id: "" }))
        .select()
        .single();

      if (error) throw error;
      const newTask = mapDbToTask(data as DbTask);
      setTasks((prev) => [...prev, newTask]);
      toast.success("Tarefa adicionada com sucesso!");
      return newTask;
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Erro ao adicionar tarefa");
      return null;
    }
  };

  const updateTask = async (task: Task) => {
    try {
      const { error } = await supabase
        .from("schedule_tasks")
        .update(taskToDbPayload(task))
        .eq("id", task.id);
      if (error) throw error;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const updateMultipleTasks = async (updatedTasks: Task[]) => {
    setTasks((prev) => prev.map((t) => updatedTasks.find((u) => u.id === t.id) ?? t));
    try {
      await Promise.all(
        updatedTasks.map((task) =>
          supabase.from("schedule_tasks").update(taskToDbPayload(task)).eq("id", task.id)
        )
      );
    } catch (error) {
      console.error("Error updating multiple tasks:", error);
      toast.error("Erro ao atualizar tarefas em cascata");
      fetchTasks();
    }
  };

  /**
   * Add a Finish-to-Start dependency: targetId will depend on sourceId.
   * Prevents circular dependencies by checking the reverse link doesn't exist.
   */
  const addDependency = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const target = tasks.find((t) => t.id === targetId);
    if (!target) return;

    // Prevent circular: check if source already depends on target
    const alreadyDependsOnTarget = (tasks.find((t) => t.id === sourceId)?.dependencies || []).includes(targetId);
    if (alreadyDependsOnTarget) {
      toast.error("Dependência circular detectada e bloqueada");
      return;
    }

    const existing = target.dependencies || [];
    if (existing.includes(sourceId)) return; // already linked

    const updated = { ...target, dependencies: [...existing, sourceId] };
    await updateTask(updated);
    toast.success("Dependência criada");
  };

  const removeDependency = async (taskId: string, depId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const updated = { ...task, dependencies: (task.dependencies || []).filter((d) => d !== depId) };
    await updateTask(updated);
  };

  const deleteTask = async (id: string) => {
    try {
      // Remove this task from any dependencies before deleting
      const dependents = tasks.filter((t) => t.dependencies?.includes(id));
      await Promise.all(
        dependents.map((t) =>
          supabase
            .from("schedule_tasks")
            .update({ dependencies: (t.dependencies || []).filter((d) => d !== id) })
            .eq("id", t.id)
        )
      );

      const { error } = await supabase.from("schedule_tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tarefa excluída com sucesso!");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Erro ao excluir tarefa");
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    updateMultipleTasks,
    addDependency,
    removeDependency,
    deleteTask,
    refetch: fetchTasks,
  };
};
