import { MoreVertical, Clock, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OpportunityCardProps {
  id: string;
  title: string;
  client: string;
  value: string;
  type: string;
  responsible: string;
  createdAt: string;
  status: "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "ganha" | "perdida";
}

const statusConfig = {
  prospeccao: { label: "Prospecção", color: "bg-muted text-muted-foreground" },
  qualificacao: { label: "Qualificação", color: "bg-primary/10 text-primary" },
  proposta: { label: "Proposta Enviada", color: "bg-accent/10 text-accent" },
  negociacao: { label: "Negociação", color: "bg-warning/10 text-warning" },
  ganha: { label: "Ganha", color: "bg-success/10 text-success" },
  perdida: { label: "Perdida", color: "bg-destructive/10 text-destructive" },
};

export const OpportunityCard = ({ 
  title, 
  client, 
  value, 
  type, 
  responsible, 
  createdAt,
  status 
}: OpportunityCardProps) => {
  const statusInfo = statusConfig[status];

  return (
    <div className="bg-card rounded-lg border border-border p-4 hover:shadow-card transition-all duration-300 cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{client}</p>
        </div>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-success" />
          <span className="font-semibold text-success">{value}</span>
        </div>
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
