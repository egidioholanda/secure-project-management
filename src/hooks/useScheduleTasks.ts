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
});

const formatDateForDb = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

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
      setTasks((data || []).map(mapDbToTask));
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
        .insert({
          name: task.name,
          project_id: task.projectId || null,
          project_name: task.projectName || null,
          start_date: formatDateForDb(task.startDate),
          end_date: formatDateForDb(task.endDate),
          progress: task.progress,
          assignee: task.assignee || null,
          color: task.color || "#3B82F6",
        })
        .select()
        .single();

      if (error) throw error;
      const newTask = mapDbToTask(data);
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
        .update({
          name: task.name,
          project_id: task.projectId || null,
          project_name: task.projectName || null,
          start_date: formatDateForDb(task.startDate),
          end_date: formatDateForDb(task.endDate),
          progress: task.progress,
          assignee: task.assignee || null,
          color: task.color || "#3B82F6",
        })
        .eq("id", task.id);

      if (error) throw error;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schedule_tasks")
        .delete()
        .eq("id", id);
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
    deleteTask,
    refetch: fetchTasks,
  };
};
