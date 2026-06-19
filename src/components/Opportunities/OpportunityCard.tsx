import { MoreVertical, Clock, DollarSign, User, Pencil, Trash2, FolderKanban, Package, Wrench } from "lucide-react";
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
  status:
    | "prospeccao"
    | "qualificacao"
    | "proposta"
    | "negociacao"
    | "pedido_produto"
    | "pedido_servico"
    | "ganha"
    | "faturado_produto"
    | "faturado_servico"
    | "perdida";
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConvertToProject?: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  prospeccao:       { label: "Oportunidade",           color: "bg-muted text-muted-foreground" },
  qualificacao:     { label: "Oportunidade",           color: "bg-muted text-muted-foreground" },
  proposta:         { label: "Proposta Enviada",        color: "bg-accent/10 text-accent" },
  negociacao:       { label: "Pedido feito",            color: "bg-warning/10 text-warning" },
  pedido_produto:   { label: "Pedido feito — Produto", color: "bg-warning/10 text-warning" },
  pedido_servico:   { label: "Pedido feito — Serviço", color: "bg-warning/10 text-warning" },
  ganha:            { label: "Pedido Faturado",         color: "bg-success/10 text-success" },
  faturado_produto: { label: "Faturado — Produto",     color: "bg-success/10 text-success" },
  faturado_servico: { label: "Faturado — Serviço",     color: "bg-success/10 text-success" },
  perdida:          { label: "Perdida",                 color: "bg-destructive/10 text-destructive" },
};

export const OpportunityCard = ({
  id,
  title,
  client,
  value,
  productValue,
  serviceValue,
  type,
  responsible,
  createdAt,
  status,
  onEdit,
  onDelete,
  onConvertToProject,
}: OpportunityCardProps) => {
  const statusInfo = statusConfig[status] ?? statusConfig["prospeccao"];
  const hasSplit = !!(productValue || serviceValue);

  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-card transition-all duration-300 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{client}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit?.(id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
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
          <User className="w-4 h-4" />
          <span>{responsible}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{createdAt}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className={statusInfo.color}>
          {statusInfo.label}
        </Badge>
        <span className="text-xs text-muted-foreground">{type}</span>
      </div>
    </div>
  );
};
