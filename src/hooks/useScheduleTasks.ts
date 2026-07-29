import { useState, useEffect } from "react";
import { addDays, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/schedule";
import { toast } from "sonner";
import {
  CalendarConfig,
  DEFAULT_CALENDAR_CONFIG,
  snapToNextWorkingDay,
} from "@/utils/workingDaysEngine";

interface DbTask {
  id: string;
  name: string;
  project_id: string | null;
  project_name: string | null;
  start_date: string;
  end_date: string;
  progress: number;
  assignee: string | null;
  team_id: string | null;
  color: string | null;
  dependencies?: string[] | null;
  blocked_by_client?: boolean | null;
  created_at: string;
  updated_at: string;
}

// Parse "YYYY-MM-DD" as LOCAL midnight to avoid UTC offset shifting date by 1 day in Brazil (UTC-3)
const parseLocalDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Format using local date methods so timezone doesn't roll back the day
const formatDateForDb = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const mapDbToTask = (db: DbTask): Task => ({
  id: db.id,
  name: db.name,
  projectId: db.project_id || "",
  projectName: db.project_name || "",
  startDate: parseLocalDate(db.start_date),
  endDate: parseLocalDate(db.end_date),
  progress: db.progress,
  assignee: db.assignee || "",
  teamId: db.team_id ?? null,
  color: db.color || "#3B82F6",
  dependencies: Array.isArray(db.dependencies) ? db.dependencies : [],
  blockedByClient: db.blocked_by_client ?? false,
});

const taskToDbPayload = (task: Task) => ({
  name: task.name,
  project_id: task.projectId || null,
  project_name: task.projectName || null,
  start_date: formatDateForDb(task.startDate),
  end_date: formatDateForDb(task.endDate),
  progress: task.progress,
  assignee: task.assignee || null,
  team_id: task.teamId ?? null,
  color: task.color || "#3B82F6",
  dependencies: task.dependencies || [],
  blocked_by_client: task.blockedByClient ?? false,
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
   * Auto-reschedules the target (and cascades successors) to respect the new constraint.
   */
  const addDependency = async (
    sourceId: string,
    targetId: string,
    config: CalendarConfig = DEFAULT_CALENDAR_CONFIG
  ) => {
    if (sourceId === targetId) return;

    const source = tasks.find((t) => t.id === sourceId);
    const target = tasks.find((t) => t.id === targetId);
    if (!source || !target) return;

    // Prevent circular: check if source already depends on target
    if ((source.dependencies || []).includes(targetId)) {
      toast.error("Dependência circular detectada e bloqueada");
      return;
    }

    const existing = target.dependencies || [];
    if (existing.includes(sourceId)) return; // already linked

    // Compute new start for target: first working day after source ends
    const firstValidStart = snapToNextWorkingDay(addDays(source.endDate, 1), config);
    const targetDuration = differenceInDays(target.endDate, target.startDate);

    const needsReschedule = target.startDate < firstValidStart;
    const newStart = needsReschedule ? firstValidStart : target.startDate;
    const newEnd = needsReschedule ? addDays(firstValidStart, targetDuration) : target.endDate;

    const updatedTarget: Task = {
      ...target,
      dependencies: [...existing, sourceId],
      startDate: newStart,
      endDate: newEnd,
    };

    // Build cascade: collect all successor tasks that need shifting
    const allUpdates: Task[] = [updatedTarget];
    const visited = new Set<string>([updatedTarget.id]);

    const cascade = (movedTask: Task, currentTasks: Task[]) => {
      const successors = currentTasks.filter(
        (t) => !visited.has(t.id) && t.dependencies?.includes(movedTask.id)
      );
      for (const s of successors) {
        visited.add(s.id);
        const sFirstValid = snapToNextWorkingDay(addDays(movedTask.endDate, 1), config);
        if (s.startDate < sFirstValid) {
          const sDuration = differenceInDays(s.endDate, s.startDate);
          const sUpdated: Task = {
            ...s,
            startDate: sFirstValid,
            endDate: addDays(sFirstValid, sDuration),
          };
          allUpdates.push(sUpdated);
          cascade(sUpdated, currentTasks);
        }
      }
    };

    cascade(updatedTarget, tasks);
    await updateMultipleTasks(allUpdates);

    const rescheduled = allUpdates.length - 1;
    if (rescheduled > 0) {
      toast.success(`Dependência criada · ${rescheduled} tarefa(s) reagendada(s)`);
    } else {
      toast.success("Dependência criada");
    }
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
