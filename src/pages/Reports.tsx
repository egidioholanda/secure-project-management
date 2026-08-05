import { useState, useMemo } from "react";
import { FileText, Plus, Search, Loader2, ChevronsUpDown, Check } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ReportCard } from "@/components/Reports/ReportCard";
import { CreateReportDialog } from "@/components/Reports/CreateReportDialog";
import { ViewReportDialog } from "@/components/Reports/ViewReportDialog";
import { DeleteReportDialog } from "@/components/Reports/DeleteReportDialog";
import { Report } from "@/types/report";
import { useReports } from "@/hooks/useReports";
import { useProjects } from "@/hooks/useProjects";
import { useContractClients } from "@/hooks/useClients";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";
import { useAuthContext } from "@/contexts/AuthContext";

const Reports = () => {
  const { reports, loading, addReport, updateReport, deleteReport } = useReports();
  const { allowedClientIds, allowedClientGroupIds, isAdmin } = useAuthContext();
  const { projects: dbProjects, loading: projectsLoading } = useProjects(
    isAdmin ? null : allowedClientIds,
    isAdmin ? null : allowedClientGroupIds
  );
  const { tasks: scheduleTasks, loading: tasksLoading } = useScheduleTasks();
  const { data: contractClients = [], isLoading: contractClientsLoading } = useContractClients(isAdmin ? null : allowedClientGroupIds);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [projectComboOpen, setProjectComboOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editReport, setEditReport] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  const toDialogTasks = (projectId: string) =>
    scheduleTasks
      .filter((t) => t.projectId === projectId)
      .map((t) => ({
        id: t.id,
        name: t.name,
        progress: t.progress,
        status: t.progress === 100 ? "completed" as const : t.progress > 0 ? "in_progress" as const : "pending" as const,
        assignee: t.assignee || "",
      }));

  // Regular projects + maintenance-contract-only clients (those without a project)
  const projectsForDialog = useMemo(() => {
    const fromProjects = dbProjects.map((p) => ({
      id: p.id,
      name: p.name,
      tasks: toDialogTasks(p.id),
    }));

    const projectIds = new Set(dbProjects.map((p) => p.id));
    const fromContracts = contractClients
      .filter((c) => !projectIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        tasks: toDialogTasks(c.id),
        isMaintenanceClient: true,
      }));

    return [...fromProjects, ...fromContracts];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbProjects, contractClients, scheduleTasks]);

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

  if (loading || projectsLoading || tasksLoading || contractClientsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
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
          <Popover open={projectComboOpen} onOpenChange={setProjectComboOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={projectComboOpen}
                className="w-full md:w-[260px] justify-between font-normal"
              >
                <span className="truncate">
                  {projectFilter === "all"
                    ? "Todos os clientes"
                    : (dbProjects.find((p) => p.id === projectFilter)?.name
                        ?? contractClients.find((c) => c.id === projectFilter)?.name
                        ?? "Todos os clientes")}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar cliente ou projeto..." />
                <CommandList>
                  <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                  <CommandItem
                    value="all"
                    onSelect={() => { setProjectFilter("all"); setProjectComboOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", projectFilter === "all" ? "opacity-100" : "opacity-0")} />
                    Todos os clientes
                  </CommandItem>
                  {dbProjects.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Projetos">
                        {dbProjects.map((project) => (
                          <CommandItem
                            key={project.id}
                            value={project.name}
                            onSelect={() => { setProjectFilter(project.id); setProjectComboOpen(false); }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", projectFilter === project.id ? "opacity-100" : "opacity-0")} />
                            {project.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                  {contractClients.some((c) => !dbProjects.some((p) => p.id === c.id)) && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="Manutenção">
                        {contractClients
                          .filter((c) => !dbProjects.some((p) => p.id === c.id))
                          .map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={() => { setProjectFilter(c.id); setProjectComboOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", projectFilter === c.id ? "opacity-100" : "opacity-0")} />
                              {c.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
