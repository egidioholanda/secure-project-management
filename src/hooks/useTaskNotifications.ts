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
  category: "task" | "maintenance";
}

interface DbTask {
  id: string;
  name: string;
  project_name: string | null;
  end_date: string;
  progress: number;
}

interface DbSchedule {
  id: string;
  title: string;
  next_date: string;
  notify_7_days: boolean;
  notify_3_days: boolean;
  is_active: boolean;
  client: { name: string } | null;
}

export const useTaskNotifications = () => {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [schedules, setSchedules] = useState<DbSchedule[]>([]);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tasksRes, schedulesRes] = await Promise.all([
        supabase
          .from("schedule_tasks")
          .select("id, name, project_name, end_date, progress")
          .lt("progress", 100)
          .order("end_date", { ascending: true }),
        supabase
          .from("maintenance_schedules" as any)
          .select("id, title, next_date, notify_7_days, notify_3_days, is_active, client:clients(name)")
          .eq("is_active", true)
          .order("next_date", { ascending: true }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      setTasks(tasksRes.data || []);
      
      if (!schedulesRes.error) {
        setSchedules((schedulesRes.data as unknown as DbSchedule[]) || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfSeen = useCallback(() => {
    const lastSeen = localStorage.getItem(NOTIFICATIONS_SEEN_KEY);
    if (lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      const today = new Date();
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
    fetchData();
    checkIfSeen();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkIfSeen]);

  const notifications = useMemo<TaskNotification[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskNotifs: TaskNotification[] = tasks
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
          id: `task-${task.id}`,
          taskId: task.id,
          taskName: task.name,
          projectName: task.project_name || "Sem projeto",
          endDate,
          type,
          daysRemaining,
          category: "task" as const,
        };
      })
      .filter((n): n is TaskNotification => n !== null);

    const maintenanceNotifs: TaskNotification[] = schedules
      .map((schedule) => {
        const nextDate = new Date(schedule.next_date + "T00:00:00");
        nextDate.setHours(23, 59, 59, 999);
        const daysRemaining = differenceInDays(nextDate, today);

        let type: TaskNotification["type"];
        if (isPast(nextDate) && !isToday(nextDate)) {
          type = "overdue";
        } else if (isToday(nextDate)) {
          type = "today";
        } else if (daysRemaining <= 7 && schedule.notify_7_days) {
          type = "upcoming";
        } else if (daysRemaining <= 3 && schedule.notify_3_days) {
          type = "upcoming";
        } else {
          return null;
        }

        // Only show if within notification window
        if (type === "upcoming" && daysRemaining > 7) return null;
        if (type === "upcoming" && daysRemaining > 3 && !schedule.notify_7_days) return null;

        const clientName = schedule.client?.name || "Cliente";

        return {
          id: `maint-${schedule.id}`,
          taskId: schedule.id,
          taskName: `🔧 ${schedule.title}`,
          projectName: clientName,
          endDate: nextDate,
          type,
          daysRemaining,
          category: "maintenance" as const,
        };
      })
      .filter((n): n is TaskNotification => n !== null);

    return [...taskNotifs, ...maintenanceNotifs].sort((a, b) => {
      const priority = { overdue: 0, today: 1, upcoming: 2 };
      return priority[a.type] - priority[b.type] || a.daysRemaining - b.daysRemaining;
    });
  }, [tasks, schedules]);

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
    refetch: fetchData,
  };
};
