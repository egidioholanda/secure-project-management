import { useState } from "react";
import { FileText, Plus, Search, Filter, Calendar } from "lucide-react";
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
import { Report, TaskProgress } from "@/types/report";
import { toast } from "sonner";

// Sample projects with tasks
const sampleProjects = [
  {
    id: "proj-1",
    name: "CFTV Shopping Center Norte",
    tasks: [
      { id: "t1", name: "Instalação de câmeras - Setor A", progress: 100, status: "completed" as const, assignee: "João Silva" },
      { id: "t2", name: "Instalação de câmeras - Setor B", progress: 75, status: "in_progress" as const, assignee: "Maria Santos" },
      { id: "t3", name: "Configuração do NVR", progress: 50, status: "in_progress" as const, assignee: "Pedro Costa" },
      { id: "t4", name: "Testes de integração", progress: 0, status: "pending" as const, assignee: "Ana Oliveira" },
    ],
  },
  {
    id: "proj-2",
    name: "Controle de Acesso Edifício Comercial",
    tasks: [
      { id: "t5", name: "Instalação de leitores - Térreo", progress: 100, status: "completed" as const, assignee: "Carlos Lima" },
      { id: "t6", name: "Instalação de leitores - 1º andar", progress: 60, status: "in_progress" as const, assignee: "Roberto Alves" },
      { id: "t7", name: "Configuração do software", progress: 30, status: "in_progress" as const, assignee: "Julia Ferreira" },
    ],
  },
  {
    id: "proj-3",
    name: "Alarme Perimetral Condomínio",
    tasks: [
      { id: "t8", name: "Instalação de sensores", progress: 85, status: "in_progress" as const, assignee: "Marcos Souza" },
      { id: "t9", name: "Configuração da central", progress: 40, status: "in_progress" as const, assignee: "Fernanda Dias" },
    ],
  },
];

// Sample reports
const initialReports: Report[] = [
  {
    id: "rep-1",
    projectId: "proj-1",
    projectName: "CFTV Shopping Center Norte",
    title: "Relatório Semanal - Semana 50",
    createdAt: new Date(2024, 11, 15),
    author: "João Silva",
    status: "published",
    period: {
      start: new Date(2024, 11, 9),
      end: new Date(2024, 11, 15),
    },
    summary: "Progresso significativo na instalação das câmeras do Setor A. Iniciamos a instalação no Setor B conforme planejado.",
    observations: "A equipe manteve um bom ritmo de trabalho. Coordenação com a administração do shopping tem sido excelente.",
    challenges: "Houve um pequeno atraso devido à necessidade de adaptação de alguns pontos de instalação.",
    nextSteps: "Finalizar Setor B e iniciar configuração completa do NVR.",
    photos: [],
    tasks: sampleProjects[0].tasks.slice(0, 2),
  },
  {
    id: "rep-2",
    projectId: "proj-2",
    projectName: "Controle de Acesso Edifício Comercial",
    title: "Relatório Quinzenal - Dezembro 1ª Quinzena",
    createdAt: new Date(2024, 11, 16),
    author: "Carlos Lima",
    status: "draft",
    period: {
      start: new Date(2024, 11, 1),
      end: new Date(2024, 11, 15),
    },
    summary: "Instalação do térreo concluída com sucesso. Início das atividades no 1º andar.",
    observations: "Sistema do térreo já está operacional e em fase de testes pelos usuários.",
    challenges: "Necessidade de coordenar horários com os inquilinos para minimizar interrupções.",
    nextSteps: "Concluir 1º andar e integrar com sistema existente.",
    photos: [],
    tasks: sampleProjects[1].tasks.slice(0, 2),
  },
];

const Reports = () => {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editReport, setEditReport] = useState<Report | null>(null);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === "all" || report.projectId === projectFilter;
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesProject && matchesStatus;
  });

  const handleCreateReport = (reportData: Omit<Report, 'id' | 'createdAt'>) => {
    const newReport: Report = {
      ...reportData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setReports(prev => [newReport, ...prev]);
    toast.success("Relatório criado com sucesso!");
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const handleEditReport = (report: Report) => {
    setEditReport(report);
    setCreateDialogOpen(true);
  };

  const handleDeleteReport = (report: Report) => {
    setReports(prev => prev.filter(r => r.id !== report.id));
    toast.success("Relatório excluído com sucesso!");
  };

  const publishedCount = reports.filter(r => r.status === 'published').length;
  const draftCount = reports.filter(r => r.status === 'draft').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Relatórios</h1>
          <p className="text-muted-foreground">Gere relatórios de progresso para clientes</p>
        </div>
        <Button onClick={() => {
          setEditReport(null);
          setCreateDialogOpen(true);
        }}>
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
              <p className="text-2xl font-bold text-foreground">{reports.length}</p>
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
              <p className="text-2xl font-bold text-foreground">{publishedCount}</p>
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
              {sampleProjects.map(project => (
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
          <h3 className="text-xl font-semibold mb-2">Nenhum relatório encontrado</h3>
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
          {filteredReports.map(report => (
            <ReportCard
              key={report.id}
              report={report}
              onView={handleViewReport}
              onEdit={handleEditReport}
              onDelete={handleDeleteReport}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CreateReportDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projects={sampleProjects}
        onSave={handleCreateReport}
        editReport={editReport}
      />

      <ViewReportDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        report={selectedReport}
      />
    </div>
  );
};

export default Reports;
