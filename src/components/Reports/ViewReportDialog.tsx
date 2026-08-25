import { useRef, useState, useEffect } from "react";
import {
  Calendar,
  User,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Report } from "@/types/report";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportPDFPreview } from "./ReportPDFPreview";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface ViewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
}

export const ViewReportDialog = ({
  open,
  onOpenChange,
  report,
}: ViewReportDialogProps) => {
  const { settings, isLoading: loadingSettings } = useCompanySettings();
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  if (!report) return null;

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    in_progress: <AlertCircle className="w-4 h-4 text-blue-500" />,
    completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  };

  const statusLabel = {
    pending: "Pendente",
    in_progress: "Em Andamento",
    completed: "Concluída",
  };

  const completedTasks = report.tasks.filter(
    (t) => t.status === "completed"
  ).length;
  const progressPercentage =
    report.tasks.length > 0
      ? Math.round((completedTasks / report.tasks.length) * 100)
      : 0;

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      // Calculate if we need multiple pages
      const scaledHeight = imgHeight * ratio;
      const totalPages = Math.ceil(scaledHeight / pdfHeight);

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(
          imgData,
          "PNG",
          imgX,
          imgY - i * pdfHeight,
          imgWidth * ratio,
          imgHeight * ratio
        );
      }

      const fileName = `relatorio-${report.title
        .toLowerCase()
        .replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(fileName);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{report.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {report.projectName}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Company Info from Settings */}
          {settings?.header_logo_url && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground mb-2">
                Logo da empresa (das configurações)
              </p>
              <img
                src={settings.header_logo_url}
                alt="Logo da empresa"
                className="h-12 w-auto object-contain"
              />
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                Período:{" "}
                {format(report.period.start, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                {format(report.period.end, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{report.author}</span>
            </div>
            <Badge
              variant="outline"
              className={
                report.status === "published"
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }
            >
              {report.status === "published" ? "Publicado" : "Rascunho"}
            </Badge>
          </div>

          <Separator />

          {/* Summary */}
          {report.summary && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Resumo Executivo
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {report.summary}
              </p>
            </div>
          )}

          {/* Task Progress */}
          {report.tasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">
                  Progresso das Tarefas
                </h3>
                <span className="text-sm text-muted-foreground">
                  {completedTasks}/{report.tasks.length} concluídas (
                  {progressPercentage}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="space-y-2">
                {report.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    {statusIcon[task.status]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.assignee}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {task.progress}%
                      </span>
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {statusLabel[task.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos */}
          {report.photos.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">
                Registro Fotográfico
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {report.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="rounded-lg overflow-hidden border border-border"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "Foto do relatório"}
                      className="w-full h-32 object-cover"
                    />
                    {photo.caption?.trim() && (
                      <div className="p-2 bg-muted/30">
                        <p className="text-xs text-muted-foreground truncate">
                          {photo.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observations */}
          {report.observations && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Observações Detalhadas
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {report.observations}
              </p>
            </div>
          )}

          {/* Challenges */}
          {report.challenges && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Desafios Encontrados
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {report.challenges}
              </p>
            </div>
          )}

          {/* Next Steps */}
          {report.nextSteps && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Próximos Passos
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {report.nextSteps}
              </p>
            </div>
          )}

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Gerado em:{" "}
              {format(report.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <span>Relatório #{report.id.slice(0, 8)}</span>
          </div>
        </div>

        {/* Hidden PDF Preview for Export */}
        <div className="fixed left-[-9999px] top-0">
          <ReportPDFPreview ref={pdfRef} report={report} companySettings={settings} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
