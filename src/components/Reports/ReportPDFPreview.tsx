import { forwardRef } from "react";
import { Report } from "@/types/report";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface ReportPDFPreviewProps {
  report: Report;
  companyLogo?: string | null;
}

export const ReportPDFPreview = forwardRef<HTMLDivElement, ReportPDFPreviewProps>(
  ({ report, companyLogo }, ref) => {
    const statusLabel = {
      pending: "Pendente",
      in_progress: "Em Andamento",
      completed: "Concluída",
    };

    const completedTasks = report.tasks.filter((t) => t.status === "completed").length;
    const progressPercentage =
      report.tasks.length > 0
        ? Math.round((completedTasks / report.tasks.length) * 100)
        : 0;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 w-[210mm] min-h-[297mm]"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header with Logo */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-300">
          <div className="flex items-center gap-4">
            {companyLogo && (
              <img
                src={companyLogo}
                alt="Logo da Empresa"
                className="h-16 w-auto object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{report.title}</h1>
              <p className="text-gray-600">{report.projectName}</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>
              Período: {format(report.period.start, "dd/MM/yyyy", { locale: ptBR })} -{" "}
              {format(report.period.end, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p>Autor: {report.author}</p>
            <p>
              Gerado em: {format(report.createdAt, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Resumo Executivo
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {report.summary}
            </p>
          </div>
        )}

        {/* Task Progress */}
        {report.tasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Progresso das Tarefas
            </h2>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700">
                {progressPercentage}% ({completedTasks}/{report.tasks.length})
              </span>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-2 border border-gray-300">Tarefa</th>
                  <th className="text-left p-2 border border-gray-300">Responsável</th>
                  <th className="text-center p-2 border border-gray-300">Progresso</th>
                  <th className="text-center p-2 border border-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="p-2 border border-gray-300">{task.name}</td>
                    <td className="p-2 border border-gray-300">{task.assignee}</td>
                    <td className="p-2 border border-gray-300 text-center">
                      {task.progress}%
                    </td>
                    <td className="p-2 border border-gray-300 text-center">
                      {statusLabel[task.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Photos */}
        {report.photos.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Registro Fotográfico
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {report.photos.map((photo) => (
                <div key={photo.id} className="border border-gray-300 rounded overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className="w-full h-40 object-cover"
                  />
                  <p className="text-xs text-gray-600 p-2 bg-gray-50">{photo.caption}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Observations */}
        {report.observations && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Observações Detalhadas
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {report.observations}
            </p>
          </div>
        )}

        {/* Challenges */}
        {report.challenges && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Desafios Encontrados
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {report.challenges}
            </p>
          </div>
        )}

        {/* Next Steps */}
        {report.nextSteps && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2 border-b border-gray-200 pb-1">
              Próximos Passos
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {report.nextSteps}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>
            Relatório #{report.id.slice(0, 8)} • Gerado automaticamente pelo SecureProject
          </p>
        </div>
      </div>
    );
  }
);

ReportPDFPreview.displayName = "ReportPDFPreview";
