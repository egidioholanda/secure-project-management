import { useState, useMemo } from "react";
import { FileText, Plus, Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportCard } from "@/components/Reports/ReportCard";
import { CreateReportDialog } from "@/components/Reports/CreateReportDialog";
import { ViewReportDialog } from "@/components/Reports/ViewReportDialog";
import { DeleteReportDialog } from "@/components/Reports/DeleteReportDialog";
import { Report } from "@/types/report";
import { useReports } from "@/hooks/useReports";
import { useProjects } from "@/hooks/useProjects";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";

const Reports = () => {
  const { reports, loading, addReport, updateReport, deleteReport } = useReports();
  const { projects: dbProjects, loading: projectsLoading } = useProjects();
  const { tasks: scheduleTasks, loading: tasksLoading } = useScheduleTasks();
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editReport, setEditReport] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  // Transform db projects to format needed by CreateReportDialog with tasks
  const projectsForDialog = useMemo(() => {
    return dbProjects.map((p) => ({
      id: p.id,
      name: p.name,
      tasks: scheduleTasks
        .filter((t) => t.projectId === p.id)
        .map((t) => ({
          id: t.id,
          name: t.name,
          progress: t.progress,
          status: t.progress === 100 ? "completed" as const : t.progress > 0 ? "in_progress" as const : "pending" as const,
          assignee: t.assignee || "",
        })),
    }));
  }, [dbProjects, scheduleTasks]);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject =
      projectFilter === "all" || report.projectId === projectFilter;
    const matchesStatus =
      statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const handleCreateReport = async (
    reportData: Omit<Report, "id" | "createdAt">
  ) => {
    if (editReport) {
      await updateReport({ ...reportData, id: editReport.id, createdAt: editReport.createdAt });
    } else {
      await addReport(reportData);
    }
    setEditReport(null);
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const handleEditReport = (report: Report) => {
    setEditReport(report);
    setCreateDialogOpen(true);
  };

  const handleDeleteClick = (report: Report) => {
    setReportToDelete(report);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (reportToDelete) {
      await deleteReport(reportToDelete.id);
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    }
  };

  const publishedCount = reports.filter((r) => r.status === "published").length;
  const draftCount = reports.filter((r) => r.status === "draft").length;

  if (loading || projectsLoading || tasksLoading) {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios de progresso para clientes
          </p>
        </div>
        <Button
          onClick={() => {
            setEditReport(null);
            setCreateDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {reports.length}
              </p>
              <p className="text-sm text-muted-foreground">Total de Relatórios</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {publishedCount}
              </p>
              <p className="text-sm text-muted-foreground">Publicados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{draftCount}</p>
              <p className="text-sm text-muted-foreground">Rascunhos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar relatórios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="Filtrar por projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Projetos</SelectItem>
              {dbProjects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <Card className="p-12 text-center bg-card/50 backdrop-blur-sm border-border/50">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            Nenhum relatório encontrado
          </h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            {searchTerm || projectFilter !== "all" || statusFilter !== "all"
              ? "Tente ajustar os filtros para encontrar o que procura."
              : "Comece criando seu primeiro relatório de progresso."}
          </p>
          {!searchTerm && projectFilter === "all" && statusFilter === "all" && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Relatório
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onView={handleViewReport}
              onEdit={handleEditReport}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateReportDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setEditReport(null);
        }}
        projects={projectsForDialog}
        onSave={handleCreateReport}
        editReport={editReport}
      />

      <ViewReportDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        report={selectedReport}
      />

      <DeleteReportDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        report={reportToDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Reports;
