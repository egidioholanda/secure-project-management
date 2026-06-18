import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, isPast, isToday } from "date-fns";

const SEEN_KEY = "notifications_seen_count";
const DISMISSED_KEY = "notifications_dismissed";

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

// Dismissed IDs are valid only for today
const getDismissedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const { date, ids } = JSON.parse(raw);
    if (new Date(date).toDateString() === new Date().toDateString()) {
      return new Set(ids as string[]);
    }
    return new Set();
  } catch {
    return new Set();
  }
};

const saveDismissedIds = (ids: Set<string>) => {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({
    date: new Date().toISOString(),
    ids: Array.from(ids),
  }));
};

// Badge is suppressed when the last-seen count >= current count (same day)
const getSeenCount = (): number => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    if (new Date(date).toDateString() === new Date().toDateString()) return count as number;
    return 0;
  } catch {
    return 0;
  }
};

export const useTaskNotifications = () => {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [schedules, setSchedules] = useState<DbSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(getDismissedIds);
  const [seenCount, setSeenCount] = useState(getSeenCount);

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

  useEffect(() => {
    fetchData();
    // Refresh dismissed IDs and seen count on mount (in case date changed)
    setDismissedIds(getDismissedIds());
    setSeenCount(getSeenCount());
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const allNotifications = useMemo<TaskNotification[]>(() => {
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
      .filter(Boolean) as TaskNotification[];

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

        if (type === "upcoming" && daysRemaining > 7) return null;
        if (type === "upcoming" && daysRemaining > 3 && !schedule.notify_7_days) return null;

        return {
          id: `maint-${schedule.id}`,
          taskId: schedule.id,
          taskName: `🔧 ${schedule.title}`,
          projectName: schedule.client?.name || "Cliente",
          endDate: nextDate,
          type,
          daysRemaining,
          category: "maintenance" as const,
        };
      })
      .filter(Boolean) as TaskNotification[];

    return [...taskNotifs, ...maintenanceNotifs].sort((a, b) => {
      const priority = { overdue: 0, today: 1, upcoming: 2 };
      return priority[a.type] - priority[b.type] || a.daysRemaining - b.daysRemaining;
    });
  }, [tasks, schedules]);

  // Visible notifications = all minus dismissed
  const notifications = useMemo(
    () => allNotifications.filter((n) => !dismissedIds.has(n.id)),
    [allNotifications, dismissedIds]
  );

  const overdueCount = notifications.filter((n) => n.type === "overdue").length;
  const todayCount = notifications.filter((n) => n.type === "today").length;
  const upcomingCount = notifications.filter((n) => n.type === "upcoming").length;
  const totalCount = notifications.length;

  // Badge appears when current count exceeds what was seen last time
  const hasBeenSeen = totalCount <= seenCount;

  const markAsSeen = useCallback(() => {
    const count = totalCount;
    localStorage.setItem(SEEN_KEY, JSON.stringify({ date: new Date().toISOString(), count }));
    setSeenCount(count);
  }, [totalCount]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissedIds(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const all = new Set(allNotifications.map((n) => n.id));
    saveDismissedIds(all);
    setDismissedIds(all);
    markAsSeen();
  }, [allNotifications, markAsSeen]);

  return {
    notifications,
    loading,
    overdueCount,
    todayCount,
    upcomingCount,
    totalCount,
    hasBeenSeen,
    markAsSeen,
    dismissNotification,
    dismissAll,
    refetch: fetchData,
  };
};
