import { useState, useRef } from "react";
import { Calendar, User, FileText, Eye, Download, MoreVertical, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Report } from "@/types/report";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportPDFPreview } from "./ReportPDFPreview";
import { exportReportToPDF } from "@/utils/exportReportPDF";
import { toast } from "sonner";

interface ReportCardProps {
  report: Report;
  onView: (report: Report) => void;
  onEdit: (report: Report) => void;
  onDelete: (report: Report) => void;
}

export const ReportCard = ({ report, onView, onEdit, onDelete }: ReportCardProps) => {
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const statusColors = {
    draft: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    published: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };

  const statusLabels = {
    draft: "Rascunho",
    published: "Publicado",
  };

  const completedTasks = report.tasks.filter(t => t.status === 'completed').length;
  const totalTasks = report.tasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleDownloadPDF = async () => {
    if (!pdfRef.current) return;
    
    setExporting(true);
    try {
      await exportReportToPDF(report, pdfRef.current);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Card className="p-5 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {report.title}
              </h3>
              <p className="text-sm text-muted-foreground">{report.projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[report.status]}>
              {statusLabels[report.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(report)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(report)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(report)} className="text-destructive">
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {report.summary}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {format(report.period.start, "dd/MM", { locale: ptBR })} - {format(report.period.end, "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span>{report.author}</span>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso das tarefas</span>
            <span className="font-medium text-foreground">{progressPercentage}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            {report.photos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {report.photos.length} foto{report.photos.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8" onClick={() => onView(report)}>
              <Eye className="w-4 h-4 mr-1.5" />
              Ver
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={handleDownloadPDF}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-1.5" />
              )}
              PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Hidden PDF Preview for Export */}
      <div className="fixed left-[-9999px] top-0">
        <ReportPDFPreview ref={pdfRef} report={report} companyLogo={null} />
      </div>
    </>
  );
};
