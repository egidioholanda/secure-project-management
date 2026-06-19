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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Opportunity } from "@/hooks/useOpportunities";

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
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [productValue, setProductValue] = useState("");
  const [serviceValue, setServiceValue] = useState("");
  const [type, setType] = useState("");
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
      setProductValue(
        source.productValue ? stripPrefix(source.productValue) : stripPrefix(source.value)
      );
      setServiceValue(stripPrefix(source.serviceValue || ""));
      setType(source.type);
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
    setProductValue("");
    setServiceValue("");
    setType("");
    setResponsible("");
    setStatus("prospeccao");
    setDescription("");
    setOriginalTitle("");
  };

  const handleSubmit = () => {
    if (!title || !client || (!productValue && !serviceValue) || !type || !responsible) {
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
      productValue: toValue(productValue),
      serviceValue: toValue(serviceValue),
      value: totalValue ? `R$ ${totalValue}` : toValue(productValue),
      monthlyValue: "",
      type,
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CFTV">CFTV</SelectItem>
                  <SelectItem value="Controle de Acesso">Controle de Acesso</SelectItem>
                  <SelectItem value="Alarme Perimetral">Alarme Perimetral</SelectItem>
                  <SelectItem value="Sistema Integrado">Sistema Integrado</SelectItem>
                  <SelectItem value="Automação">Automação</SelectItem>
                </SelectContent>
              </Select>
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
