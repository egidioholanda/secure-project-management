import { Calendar, User, Download, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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

interface ViewReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: Report | null;
}

export const ViewReportDialog = ({ open, onOpenChange, report }: ViewReportDialogProps) => {
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

  const completedTasks = report.tasks.filter(t => t.status === 'completed').length;
  const progressPercentage = report.tasks.length > 0 
    ? Math.round((completedTasks / report.tasks.length) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{report.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{report.projectName}</p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                Período: {format(report.period.start, "dd/MM/yyyy", { locale: ptBR })} - {format(report.period.end, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{report.author}</span>
            </div>
            <Badge variant="outline" className={
              report.status === 'published' 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            }>
              {report.status === 'published' ? 'Publicado' : 'Rascunho'}
            </Badge>
          </div>

          <Separator />

          {/* Summary */}
          {report.summary && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Resumo Executivo</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.summary}</p>
            </div>
          )}

          {/* Task Progress */}
          {report.tasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Progresso das Tarefas</h3>
                <span className="text-sm text-muted-foreground">
                  {completedTasks}/{report.tasks.length} concluídas ({progressPercentage}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="space-y-2">
                {report.tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    {statusIcon[task.status]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{task.assignee}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{task.progress}%</span>
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
              <h3 className="font-semibold text-foreground mb-3">Registro Fotográfico</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {report.photos.map(photo => (
                  <div key={photo.id} className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2 bg-muted/30">
                      <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observations */}
          {report.observations && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Observações Detalhadas</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.observations}</p>
            </div>
          )}

          {/* Challenges */}
          {report.challenges && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Desafios Encontrados</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.challenges}</p>
            </div>
          )}

          {/* Next Steps */}
          {report.nextSteps && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">Próximos Passos</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{report.nextSteps}</p>
            </div>
          )}

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Gerado em: {format(report.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <span>
              Relatório #{report.id.slice(0, 8)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
