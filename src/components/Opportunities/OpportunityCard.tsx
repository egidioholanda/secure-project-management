import {
  MoreVertical,
  Copy,
  Pencil,
  Trash2,
  FolderKanban,
  Users,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BRL,
  formatCompact,
  getStage,
  type SalesStage,
} from "@/lib/salesStages";

interface OpportunityCardProps {
  id: string;
  title: string;
  client: string;
  value: number;
  productValue: number | null;
  serviceValue: number | null;
  type: string;
  responsible: string;
  createdAtIso: string;
  expectedCloseDate?: string | null;
  clientGroupName?: string | null;
  status: SalesStage;
  /** dias parado na etapa atual */
  daysInStage: number;
  /** ganha e ainda sem projeto aberto — o vazamento entre comercial e obra */
  awaitingProject?: boolean;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConvertToProject?: (id: string) => void;
  onMarkLost?: (id: string) => void;
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR") : "";

export const OpportunityCard = ({
  id,
  title,
  client,
  value,
  productValue,
  serviceValue,
  type,
  responsible,
  expectedCloseDate,
  clientGroupName,
  status,
  daysInStage,
  awaitingProject,
  onEdit,
  onDuplicate,
  onDelete,
  onConvertToProject,
  onMarkLost,
}: OpportunityCardProps) => {
  const stage = getStage(status);
  const prod = productValue ?? 0;
  const serv = serviceValue ?? 0;
  const total = prod + serv || value;
  // Barra de composição: preenchido = produto, vazado = serviço. Diz num
  // relance se o negócio é de material ou de mão de obra, sem ler dígito.
  const prodPct = total > 0 ? (prod / total) * 100 : 0;

  const onlyProduct = productValue !== null && serviceValue === null;
  const onlyService = serviceValue !== null && productValue === null;
  const isLate = daysInStage > stage.slaDays && stage.slaDays > 0;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border p-4 hover:shadow-card transition-all duration-300 cursor-pointer group",
        awaitingProject
          ? "border-amber-500/60 bg-amber-500/5"
          : "border-border",
      )}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors leading-tight truncate">
            {title}
          </h3>
          {type && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {type.split(",").map((t) => t.trim()).filter(Boolean).join(" + ")}
            </p>
          )}
          <p className="text-sm text-muted-foreground truncate">{client}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 h-8 w-8"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(id)}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onConvertToProject?.(id)}>
              <FolderKanban className="w-4 h-4 mr-2" />
              Abrir projeto
            </DropdownMenuItem>
            {status !== "perdida" && (
              <DropdownMenuItem onClick={() => onMarkLost?.(id)}>
                <XCircle className="w-4 h-4 mr-2" />
                Marcar como perdida
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Valor: um número grande, dois pequenos, uma barra ── */}
      <p className="text-xl font-bold text-card-foreground leading-none tabular-nums">
        {BRL.format(total)}
      </p>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2 flex">
        <div
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${prodPct}%` }}
        />
        <div className="h-full flex-1 bg-blue-500/70" />
      </div>

      <p className="text-xs text-muted-foreground mt-1.5 truncate">
        {onlyProduct ? (
          <span className="text-violet-500">Somente produto</span>
        ) : onlyService ? (
          <span className="text-blue-500">Somente serviço</span>
        ) : (
          <>
            <span className="text-violet-500">
              Produto {formatCompact(prod)}
            </span>
            {" · "}
            <span className="text-blue-500">Serviço {formatCompact(serv)}</span>
          </>
        )}
      </p>

      {clientGroupName && (
        <div className="flex items-center gap-1.5 mt-2">
          <Users className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium truncate">
            {clientGroupName}
          </span>
        </div>
      )}

      {/* ── Alerta de vazamento: ganha mas sem projeto ── */}
      {awaitingProject ? (
        <div className="mt-3 pt-3 border-t border-amber-500/30">
          <p className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Ganha há {daysInStage} {daysInStage === 1 ? "dia" : "dias"}, sem
            projeto
          </p>
          <Button
            size="sm"
            className="w-full mt-2 h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onConvertToProject?.(id);
            }}
          >
            <FolderKanban className="w-3.5 h-3.5 mr-1.5" />
            Abrir projeto
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 min-w-0">
            {responsible && (
              <span
                title={responsible}
                className="text-[10px] font-bold bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              >
                {initials(responsible)}
              </span>
            )}
            {expectedCloseDate && (
              <span className="text-[11px] text-muted-foreground truncate">
                prev. {fmtDate(expectedCloseDate)}
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-[11px] tabular-nums shrink-0",
              isLate ? "text-red-500 font-semibold" : "text-muted-foreground",
            )}
          >
            {daysInStage}d{isLate && " ⚠"}
          </span>
        </div>
      )}

      {status === "perdida" && (
        <Badge variant="secondary" className={cn("mt-2", stage.badgeClass)}>
          {stage.label}
        </Badge>
      )}
    </div>
  );
};
