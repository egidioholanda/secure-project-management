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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Opportunity } from "@/hooks/useOpportunities";
import { useClientGroups } from "@/hooks/useClientGroups";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  BRL,
  LOSS_REASONS,
  STAGES,
  SYSTEM_TYPES,
  dealKey,
  hasProductServiceSuffix,
  stripSuffix,
  type SalesStage,
} from "@/lib/salesStages";

interface AddOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (opportunity: Omit<Opportunity, "id" | "createdAt">) => void;
  onEdit?: (opportunity: Opportunity) => void;
  editingOpportunity?: Opportunity | null;
  /** para detectar que o usuário está recriando um negócio que já existe */
  existingOpportunities?: Opportunity[];
}

const parseInput = (raw: string): number | null => {
  if (!raw.trim()) return null;
  const n = parseFloat(raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};

const toInput = (v: number | null): string =>
  v === null || v === undefined ? "" : String(v).replace(".", ",");

export function AddOpportunityDialog({
  open,
  onOpenChange,
  onAdd,
  onEdit,
  editingOpportunity,
  existingOpportunities = [],
}: AddOpportunityDialogProps) {
  const { groups } = useClientGroups();
  const { allowedClientGroupIds } = useAuthContext();
  const visibleGroups =
    allowedClientGroupIds === null
      ? groups
      : groups.filter((g) => allowedClientGroupIds.includes(g.id));

  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [clientGroupId, setClientGroupId] = useState<string | null>(null);
  const [productValue, setProductValue] = useState("");
  const [serviceValue, setServiceValue] = useState("");
  const [noProduct, setNoProduct] = useState(false);
  const [noService, setNoService] = useState(false);
  const [types, setTypes] = useState<string[]>([]);
  const [responsible, setResponsible] = useState("");
  const [status, setStatus] = useState<SalesStage>("qualificacao");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [lossReason, setLossReason] = useState("");
  const [description, setDescription] = useState("");

  const isEditing = !!editingOpportunity;

  useEffect(() => {
    const s = editingOpportunity;
    if (s) {
      setTitle(s.title);
      setClient(s.client);
      setClientGroupId(s.clientGroupId ?? null);
      setProductValue(toInput(s.productValue));
      setServiceValue(toInput(s.serviceValue));
      setNoProduct(s.productValue === null && s.serviceValue !== null);
      setNoService(s.serviceValue === null && s.productValue !== null);
      setTypes(s.type ? s.type.split(",").map((t) => t.trim()).filter(Boolean) : []);
      setResponsible(s.responsible);
      setStatus(s.status);
      setExpectedCloseDate(s.expectedCloseDate ?? "");
      setLossReason(s.lossReason ?? "");
      setDescription(s.description || "");
    } else {
      setTitle("");
      setClient("");
      setClientGroupId(null);
      setProductValue("");
      setServiceValue("");
      setNoProduct(false);
      setNoService(false);
      setTypes([]);
      setResponsible("");
      setStatus("qualificacao");
      setExpectedCloseDate("");
      setLossReason("");
      setDescription("");
    }
  }, [editingOpportunity, open]);

  const prod = noProduct ? null : parseInput(productValue);
  const serv = noService ? null : parseInput(serviceValue);
  const total = (prod ?? 0) + (serv ?? 0);

  /**
   * O hábito antigo era criar "X - Produtos" e "X - Serviços". Em vez de só
   * proibir, mostramos o negócio que já existe e oferecemos completá-lo — o
   * caminho certo precisa ser mais rápido que o errado.
   */
  const duplicateWarning = useMemo(() => {
    if (isEditing || !title.trim() || !client.trim()) return null;
    const key = dealKey(title, client);
    return existingOpportunities.find((o) => dealKey(o.title, o.client) === key) ?? null;
  }, [title, client, existingOpportunities, isEditing]);

  const suffixWarning = hasProductServiceSuffix(title);

  const handleSubmit = () => {
    if (!title.trim() || !client.trim() || types.length === 0 || !responsible.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (prod === null && serv === null) {
      toast.error("Informe o valor de produto, de serviço, ou marque que não há");
      return;
    }
    if (status === "perdida" && !lossReason) {
      toast.error("Informe o motivo da perda");
      return;
    }
    if (suffixWarning) {
      toast.error(
        'Um negócio = uma oportunidade. Remova o "- Produtos"/"- Serviços" do título.',
      );
      return;
    }

    const payload = {
      title: title.trim(),
      client: client.trim(),
      clientId: editingOpportunity?.clientId ?? null,
      clientGroupId: clientGroupId || null,
      value: total,
      monthlyValue: 0,
      productValue: prod,
      serviceValue: serv,
      type: types.join(","),
      responsible: responsible.trim(),
      status,
      createdAtIso: editingOpportunity?.createdAtIso ?? new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
      description,
      expectedCloseDate: expectedCloseDate || null,
      lossReason: status === "perdida" ? lossReason : null,
      archivedAt: null,
      mergedIntoId: null,
    };

    if (isEditing && editingOpportunity && onEdit) {
      onEdit({ ...editingOpportunity, ...payload });
    } else {
      onAdd(payload);
    }
    onOpenChange(false);
  };

  const toggleType = (t: string) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
          <DialogDescription>
            Um negócio = uma oportunidade. Produto e serviço são dois pedidos do
            mesmo negócio — o faturamento de cada um é acompanhado no Financeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── O negócio ── */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: SE Bom Jardim"
            />
            {suffixWarning && (
              <div className="flex items-start gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-md p-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  Não separe produto e serviço em oportunidades diferentes — os
                  dois valores cabem aqui.
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 ml-1 text-xs"
                    onClick={() => setTitle(stripSuffix(title))}
                  >
                    Usar "{stripSuffix(title)}"
                  </Button>
                </div>
              </div>
            )}
            {duplicateWarning && (
              <div className="flex items-start gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-md p-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  Já existe um negócio para <strong>{duplicateWarning.client}</strong>:{" "}
                  "{duplicateWarning.title}" · {BRL.format(duplicateWarning.value)}
                  {duplicateWarning.serviceValue === null &&
                    " · sem valor de serviço preenchido"}
                  .
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente *</Label>
              <Input
                id="client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Ex: Enel Ceará"
              />
            </div>
            <div className="space-y-2">
              <Label>Grupo de Clientes</Label>
              <Select
                value={clientGroupId ?? "__none__"}
                onValueChange={(v) => setClientGroupId(v === "__none__" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem grupo</SelectItem>
                  {visibleGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* ── Valores ── */}
          <div className="space-y-3">
            <Label>Valores do negócio *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productValue" className="text-xs text-violet-500">
                  Produto (equipamentos)
                </Label>
                <Input
                  id="productValue"
                  value={productValue}
                  onChange={(e) => setProductValue(e.target.value)}
                  placeholder="Ex: 164.345,60"
                  disabled={noProduct}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noProduct"
                    checked={noProduct}
                    onCheckedChange={(v) => {
                      setNoProduct(!!v);
                      if (v) setProductValue("");
                    }}
                  />
                  <Label htmlFor="noProduct" className="text-xs font-normal cursor-pointer">
                    Não há venda de material
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="serviceValue" className="text-xs text-blue-500">
                  Serviço (instalação)
                </Label>
                <Input
                  id="serviceValue"
                  value={serviceValue}
                  onChange={(e) => setServiceValue(e.target.value)}
                  placeholder="Ex: 82.921,76"
                  disabled={noService}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noService"
                    checked={noService}
                    onCheckedChange={(v) => {
                      setNoService(!!v);
                      if (v) setServiceValue("");
                    }}
                  />
                  <Label htmlFor="noService" className="text-xs font-normal cursor-pointer">
                    Não há serviço de instalação
                  </Label>
                </div>
              </div>
            </div>

            {/* Total é derivado, nunca digitado: três campos que podiam se
                contradizer eram a origem de números em que ninguém confiava. */}
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor total
                </span>
                <span className="text-lg font-bold tabular-nums">
                  {BRL.format(total)}
                </span>
              </div>
              {total > 0 && (
                <>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2 flex">
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: `${((prod ?? 0) / total) * 100}%` }}
                    />
                    <div className="h-full flex-1 bg-blue-500/70" />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Produto {Math.round(((prod ?? 0) / total) * 100)}% · Serviço{" "}
                    {Math.round(((serv ?? 0) / total) * 100)}%
                  </p>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* ── Comercial ── */}
          <div className="space-y-2">
            <Label>Sistemas *</Label>
            <div className="flex flex-wrap gap-2">
              {SYSTEM_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    types.includes(t)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável *</Label>
              <Input
                id="responsible"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Ex: Marcos"
              />
            </div>
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SalesStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedClose">Previsão de fechamento</Label>
              <Input
                id="expectedClose"
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
              />
            </div>
          </div>

          {status === "perdida" && (
            <div className="space-y-2">
              <Label>Motivo da perda *</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Por que o negócio foi perdido?" />
                </SelectTrigger>
                <SelectContent>
                  {LOSS_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Observações</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
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
