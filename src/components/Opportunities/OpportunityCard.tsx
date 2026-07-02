import { MoreVertical, Clock, DollarSign, User, Pencil, Trash2, FolderKanban, Package, Wrench, Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OpportunityCardProps {
  id: string;
  title: string;
  client: string;
  value: string;
  productValue?: string;
  serviceValue?: string;
  type: string;
  responsible: string;
  createdAt: string;
  createdAtIso: string;
  clientGroupName?: string | null;
  status:
    | "prospeccao"
    | "qualificacao"
    | "proposta"
    | "pedido_cliente"
    | "negociacao"
    | "pedido_produto"
    | "pedido_servico"
    | "ganha"
    | "faturado_produto"
    | "faturado_servico"
    | "perdida";
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConvertToProject?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  prospeccao:       { label: "Oportunidade",                      color: "bg-muted text-muted-foreground" },
  qualificacao:     { label: "Oportunidade",                      color: "bg-muted text-muted-foreground" },
  proposta:         { label: "Proposta Enviada",                   color: "bg-accent/10 text-accent" },
  pedido_cliente:   { label: "Pedido Cliente Enviado",             color: "bg-violet-500/10 text-violet-500" },
  negociacao:       { label: "Pedido Comercial Criado",            color: "bg-warning/10 text-warning" },
  pedido_produto:   { label: "Ped. Comercial — Produto",          color: "bg-warning/10 text-warning" },
  pedido_servico:   { label: "Ped. Comercial — Serviço",          color: "bg-warning/10 text-warning" },
  ganha:            { label: "Pedido Faturado",                    color: "bg-success/10 text-success" },
  faturado_produto: { label: "Faturado — Produto",                color: "bg-success/10 text-success" },
  faturado_servico: { label: "Faturado — Serviço",                color: "bg-success/10 text-success" },
  perdida:          { label: "Perdida",                            color: "bg-destructive/10 text-destructive" },
};

function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export const OpportunityCard = ({
  id,
  title,
  client,
  value,
  productValue,
  serviceValue,
  type,
  responsible,
  createdAtIso,
  clientGroupName,
  status,
  onEdit,
  onDuplicate,
  onDelete,
  onConvertToProject,
}: OpportunityCardProps) => {
  const statusInfo = statusConfig[status] ?? statusConfig["prospeccao"];
  const hasSplit = !!(productValue || serviceValue);

  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-card transition-all duration-300 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors leading-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{client}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
              Converter em Projeto
            </DropdownMenuItem>
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

      <div className="space-y-1.5 mb-3">
        {hasSplit ? (
          <>
            {productValue && (
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span className="text-xs text-muted-foreground">Produto:</span>
                <span className="font-semibold text-violet-600 dark:text-violet-400">{productValue}</span>
              </div>
            )}
            {serviceValue && (
              <div className="flex items-center gap-2 text-sm">
                <Wrench className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-xs text-muted-foreground">Serviço:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{serviceValue}</span>
              </div>
            )}
            {productValue && serviceValue && value && (
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="font-bold text-success">{value}</span>
              </div>
            )}
          </>
        ) : (
          value && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Venda:</span>
              <span className="font-semibold text-success">{value}</span>
            </div>
          )
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="w-4 h-4 shrink-0" />
          <span className="truncate">{responsible}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span>{fmtDate(createdAtIso)}</span>
        </div>
        {clientGroupName && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium truncate">
              {clientGroupName}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="secondary" className={statusInfo.color}>
          {statusInfo.label}
        </Badge>
        <div className="flex gap-1 flex-wrap justify-end">
          {type
            ? type.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t}</span>
              ))
            : null}
        </div>
      </div>
    </div>
  );
};
