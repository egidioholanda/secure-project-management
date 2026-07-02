import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const SERVICE_TYPES = ["CFTV", "Controle de Acesso", "Alarme Perimetral", "Sistema Integrado", "Automação"];
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Opportunity } from "@/hooks/useOpportunities";
import { useClientGroups } from "@/hooks/useClientGroups";

interface AddOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (opportunity: Omit<Opportunity, "id" | "createdAt">) => void;
  onEdit?: (opportunity: Opportunity) => void;
  editingOpportunity?: Opportunity | null;
  duplicatingOpportunity?: Opportunity | null;
}

const parseBRLVal = (raw: string) => {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const stripPrefix = (v: string) => v.replace(/^R\$\s*/, "").trim();

export function AddOpportunityDialog({
  open,
  onOpenChange,
  onAdd,
  onEdit,
  editingOpportunity,
  duplicatingOpportunity,
}: AddOpportunityDialogProps) {
  const { groups } = useClientGroups();
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [clientGroupId, setClientGroupId] = useState<string | null>(null);
  const [productValue, setProductValue] = useState("");
  const [serviceValue, setServiceValue] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [responsible, setResponsible] = useState("");
  const [status, setStatus] = useState<Opportunity["status"]>("prospeccao");
  const [description, setDescription] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");

  const isEditing = !!editingOpportunity;
  const isDuplicating = !!duplicatingOpportunity;

  const totalValue = useMemo(() => {
    const prod = parseBRLVal(productValue);
    const serv = parseBRLVal(serviceValue);
    if (prod > 0 || serv > 0) {
      return (prod + serv).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
    }
    return "";
  }, [productValue, serviceValue]);

  useEffect(() => {
    const source = editingOpportunity ?? duplicatingOpportunity;
    if (source) {
      setTitle(source.title);
      setClient(source.client);
      setClientGroupId(source.clientGroupId ?? null);
      const hasAnySplit = !!(source.productValue || source.serviceValue);
      setProductValue(
        source.productValue
          ? stripPrefix(source.productValue)
          : hasAnySplit ? "" : stripPrefix(source.value)
      );
      setServiceValue(stripPrefix(source.serviceValue || ""));
      setTypes(source.type ? source.type.split(",").map((t) => t.trim()).filter(Boolean) : []);
      setResponsible(source.responsible);
      setStatus(source.status);
      setDescription(source.description || "");
      if (duplicatingOpportunity) setOriginalTitle(source.title);
    } else {
      resetForm();
    }
  }, [editingOpportunity, duplicatingOpportunity, open]);

  const resetForm = () => {
    setTitle("");
    setClient("");
    setClientGroupId(null);
    setProductValue("");
    setServiceValue("");
    setTypes([]);
    setResponsible("");
    setStatus("prospeccao");
    setDescription("");
    setOriginalTitle("");
  };

  const handleSubmit = () => {
    if (!title || !client || (!productValue && !serviceValue) || types.length === 0 || !responsible) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (isDuplicating && title.trim() === originalTitle.trim()) {
      toast.error("Já existe uma oportunidade com esse nome. Altere o título para salvar.");
      return;
    }

    const toValue = (raw: string) => (raw ? `R$ ${raw}` : "");

    const payload = {
      title,
      client,
      clientGroupId: clientGroupId || null,
      productValue: toValue(productValue),
      serviceValue: toValue(serviceValue),
      value: totalValue ? `R$ ${totalValue}` : toValue(productValue),
      monthlyValue: "",
      type: types.join(","),
      responsible,
      status,
      description,
    };

    if (isEditing && onEdit && editingOpportunity) {
      onEdit({ ...editingOpportunity, ...payload });
    } else {
      onAdd(payload);
    }

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Oportunidade" : isDuplicating ? "Duplicar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da oportunidade."
              : isDuplicating
              ? "Altere o título e ajuste os dados antes de salvar."
              : "Preencha os dados para criar uma nova oportunidade de negócio."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Sistema CFTV - Cliente XYZ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Input
              id="client"
              placeholder="Nome do cliente"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientGroup">Grupo de Clientes</Label>
            <Select
              value={clientGroupId ?? "__none__"}
              onValueChange={(v) => setClientGroupId(v === "__none__" ? null : v)}
            >
              <SelectTrigger id="clientGroup">
                <SelectValue placeholder="Selecione um grupo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem grupo</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Values */}
          <div className="space-y-3">
            <Label>Valores *</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="productValue" className="text-xs text-muted-foreground font-normal">
                  Valor Produto (R$)
                </Label>
                <Input
                  id="productValue"
                  placeholder="Ex: 45.000"
                  value={productValue}
                  onChange={(e) => setProductValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serviceValue" className="text-xs text-muted-foreground font-normal">
                  Valor Serviço (R$)
                </Label>
                <Input
                  id="serviceValue"
                  placeholder="Ex: 12.000"
                  value={serviceValue}
                  onChange={(e) => setServiceValue(e.target.value)}
                />
              </div>
            </div>
            {totalValue && (
              <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-foreground">R$ {totalValue}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Tipo de Serviço *</Label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((t) => {
                const selected = types.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setTypes((prev) =>
                        selected ? prev.filter((x) => x !== t) : [...prev, t]
                      )
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible">Responsável *</Label>
            <Input
              id="responsible"
              placeholder="Nome do responsável"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Opportunity["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospeccao">Oportunidade</SelectItem>
                <SelectItem value="proposta">Proposta Enviada</SelectItem>
                <SelectItem value="pedido_cliente">Pedido Cliente Enviado</SelectItem>
                <SelectItem value="negociacao">Pedido Comercial Criado</SelectItem>
                <SelectItem value="pedido_produto">Pedido Comercial Criado — somente Produto</SelectItem>
                <SelectItem value="pedido_servico">Pedido Comercial Criado — somente Serviço</SelectItem>
                <SelectItem value="ganha">Pedido Faturado</SelectItem>
                <SelectItem value="faturado_produto">Pedido Faturado — somente Produto</SelectItem>
                <SelectItem value="faturado_servico">Pedido Faturado — somente Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes adicionais sobre a oportunidade..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {isEditing ? "Salvar Alterações" : "Criar Oportunidade"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
