import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, isPast, isToday } from "date-fns";

const NOTIFICATIONS_SEEN_KEY = "notifications_last_seen";

export interface TaskNotification {
  id: string;
  taskId: string;
  taskName: string;
  projectName: string;
  endDate: Date;
  type: "overdue" | "today" | "upcoming";
  daysRemaining: number;
}

interface DbTask {
  id: string;
  name: string;
  project_name: string | null;
  end_date: string;
  progress: number;
}

export const useTaskNotifications = () => {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("schedule_tasks")
        .select("id, name, project_name, end_date, progress")
        .lt("progress", 100)
        .order("end_date", { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks for notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if notifications were already seen
  const checkIfSeen = useCallback(() => {
    const lastSeen = localStorage.getItem(NOTIFICATIONS_SEEN_KEY);
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      const today = new Date();
      // Reset "seen" status at the start of each day
      if (lastSeenDate.toDateString() === today.toDateString()) {
        setHasBeenSeen(true);
      } else {
        setHasBeenSeen(false);
      }
    }
  }, []);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(NOTIFICATIONS_SEEN_KEY, new Date().toISOString());
    setHasBeenSeen(true);
  }, []);

  useEffect(() => {
    fetchTasks();
    checkIfSeen();

    // Refresh every 5 minutes
    const interval = setInterval(fetchTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkIfSeen]);

  const notifications = useMemo<TaskNotification[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks
      .map((task) => {
        const endDate = new Date(task.end_date);
        endDate.setHours(23, 59, 59, 999);
        
        const daysRemaining = differenceInDays(endDate, today);
        
        let type: TaskNotification["type"];
        
        if (isPast(endDate) && !isToday(endDate)) {
          type = "overdue";
        } else if (isToday(endDate)) {
          type = "today";
        } else if (daysRemaining <= 3) {
          type = "upcoming";
        } else {
          return null;
        }

        return {
          id: `notif-${task.id}`,
          taskId: task.id,
          taskName: task.name,
          projectName: task.project_name || "Sem projeto",
          endDate,
          type,
          daysRemaining,
        };
      })
      .filter((n): n is TaskNotification => n !== null)
      .sort((a, b) => {
        // Sort by priority: overdue first, then today, then upcoming
        const priority = { overdue: 0, today: 1, upcoming: 2 };
        return priority[a.type] - priority[b.type] || a.daysRemaining - b.daysRemaining;
      });
  }, [tasks]);

  const overdueCount = notifications.filter((n) => n.type === "overdue").length;
  const todayCount = notifications.filter((n) => n.type === "today").length;
  const upcomingCount = notifications.filter((n) => n.type === "upcoming").length;

  return {
    notifications,
    loading,
    overdueCount,
    todayCount,
    upcomingCount,
    totalCount: notifications.length,
    hasBeenSeen,
    markAsSeen,
    refetch: fetchTasks,
  };
};
