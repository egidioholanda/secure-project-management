import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Report, TaskProgress } from "@/types/report";
import { toast } from "sonner";

interface DbReport {
  id: string;
  project_id: string | null;
  project_name: string;
  title: string;
  author: string | null;
  status: string;
  period_start: string | null;
  period_end: string | null;
  summary: string | null;
  observations: string | null;
  next_steps: string | null;
  created_at: string;
  updated_at: string;
}

interface DbReportTask {
  id: string;
  report_id: string;
  task_name: string;
  progress: number;
  status: string;
  assignee: string | null;
}

interface DbReportPhoto {
  id: string;
  report_id: string;
  url: string;
  caption: string | null;
}

const mapDbToReport = (
  db: DbReport,
  tasks: DbReportTask[] = [],
  photos: DbReportPhoto[] = []
): Report => ({
  id: db.id,
  projectId: db.project_id || "",
  projectName: db.project_name,
  title: db.title,
  createdAt: new Date(db.created_at),
  author: db.author || "",
  status: db.status as "draft" | "published",
  period: {
    start: db.period_start ? new Date(db.period_start) : new Date(),
    end: db.period_end ? new Date(db.period_end) : new Date(),
  },
  summary: db.summary || "",
  observations: db.observations || "",
  challenges: "",
  nextSteps: db.next_steps || "",
  photos: photos.map((p) => ({
    id: p.id,
    url: p.url,
    caption: p.caption || "",
    createdAt: new Date(),
  })),
  tasks: tasks.map((t) => ({
    id: t.id,
    name: t.task_name,
    progress: t.progress,
    status: t.status as "pending" | "in_progress" | "completed",
    assignee: t.assignee || "",
  })),
});

export const useReports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (reportsError) throw reportsError;

      const { data: tasksData, error: tasksError } = await supabase
        .from("report_tasks")
        .select("*");

      if (tasksError) throw tasksError;

      const { data: photosData, error: photosError } = await supabase
        .from("report_photos")
        .select("*");

      if (photosError) throw photosError;

      const mappedReports = (reportsData || []).map((r) =>
        mapDbToReport(
          r,
          (tasksData || []).filter((t) => t.report_id === r.id),
          (photosData || []).filter((p) => p.report_id === r.id)
        )
      );

      setReports(mappedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const addReport = async (
    report: Omit<Report, "id" | "createdAt">
  ): Promise<Report | null> => {
    try {
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .insert({
          project_id: report.projectId || null,
          project_name: report.projectName,
          title: report.title,
          author: report.author || null,
          status: report.status,
          period_start: report.period.start.toISOString().split("T")[0],
          period_end: report.period.end.toISOString().split("T")[0],
          summary: report.summary || null,
          observations: report.observations || null,
          next_steps: report.nextSteps || null,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Insert tasks
      if (report.tasks && report.tasks.length > 0) {
        const tasksToInsert = report.tasks.map((t) => ({
          report_id: reportData.id,
          task_name: t.name,
          progress: t.progress,
          status: t.status,
          assignee: t.assignee || null,
        }));

        const { error: tasksError } = await supabase
          .from("report_tasks")
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      // Insert photos
      if (report.photos && report.photos.length > 0) {
        const photosToInsert = report.photos.map((p) => ({
          report_id: reportData.id,
          url: p.url,
          caption: p.caption || null,
        }));

        const { error: photosError } = await supabase
          .from("report_photos")
          .insert(photosToInsert);

        if (photosError) throw photosError;
      }

      const newReport: Report = {
        ...report,
        id: reportData.id,
        createdAt: new Date(reportData.created_at),
      };

      setReports((prev) => [newReport, ...prev]);
      toast.success("Relatório criado com sucesso!");
      return newReport;
    } catch (error) {
      console.error("Error adding report:", error);
      toast.error("Erro ao criar relatório");
      return null;
    }
  };

  const updateReport = async (report: Report) => {
    try {
      const { error: reportError } = await supabase
        .from("reports")
        .update({
          project_id: report.projectId || null,
          project_name: report.projectName,
          title: report.title,
          author: report.author || null,
          status: report.status,
          period_start: report.period.start.toISOString().split("T")[0],
          period_end: report.period.end.toISOString().split("T")[0],
          summary: report.summary || null,
          observations: report.observations || null,
          next_steps: report.nextSteps || null,
        })
        .eq("id", report.id);

      if (reportError) throw reportError;

      // Delete old tasks and insert new ones
      await supabase.from("report_tasks").delete().eq("report_id", report.id);

      if (report.tasks && report.tasks.length > 0) {
        const tasksToInsert = report.tasks.map((t) => ({
          report_id: report.id,
          task_name: t.name,
          progress: t.progress,
          status: t.status,
          assignee: t.assignee || null,
        }));

        await supabase.from("report_tasks").insert(tasksToInsert);
      }

      // Delete old photos and insert new ones
      await supabase.from("report_photos").delete().eq("report_id", report.id);

      if (report.photos && report.photos.length > 0) {
        const photosToInsert = report.photos.map((p) => ({
          report_id: report.id,
          url: p.url,
          caption: p.caption || null,
        }));

        await supabase.from("report_photos").insert(photosToInsert);
      }

      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? report : r))
      );
      toast.success("Relatório atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating report:", error);
      toast.error("Erro ao atualizar relatório");
    }
  };

  const deleteReport = async (id: string) => {
    try {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (error) throw error;
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Relatório excluído com sucesso!");
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Erro ao excluir relatório");
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return {
    reports,
    loading,
    addReport,
    updateReport,
    deleteReport,
    refetch: fetchReports,
  };
};
