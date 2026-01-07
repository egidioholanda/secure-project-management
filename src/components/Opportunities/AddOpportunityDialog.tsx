import { useState, useEffect } from "react";
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
import { toast } from "sonner";

interface Opportunity {
  id: string;
  title: string;
  client: string;
  value: string;
  type: string;
  responsible: string;
  createdAt: string;
  status: "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "ganha";
  description?: string;
}

interface AddOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (opportunity: Omit<Opportunity, "id" | "createdAt">) => void;
  onEdit?: (opportunity: Opportunity) => void;
  editingOpportunity?: Opportunity | null;
}

export function AddOpportunityDialog({
  open,
  onOpenChange,
  onAdd,
  onEdit,
  editingOpportunity,
}: AddOpportunityDialogProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("");
  const [responsible, setResponsible] = useState("");
  const [status, setStatus] = useState<Opportunity["status"]>("prospeccao");
  const [description, setDescription] = useState("");

  const isEditing = !!editingOpportunity;

  useEffect(() => {
    if (editingOpportunity) {
      setTitle(editingOpportunity.title);
      setClient(editingOpportunity.client);
      // Remove "R$ " prefix for editing
      setValue(editingOpportunity.value.replace("R$ ", ""));
      setType(editingOpportunity.type);
      setResponsible(editingOpportunity.responsible);
      setStatus(editingOpportunity.status);
      setDescription(editingOpportunity.description || "");
    } else {
      resetForm();
    }
  }, [editingOpportunity, open]);

  const resetForm = () => {
    setTitle("");
    setClient("");
    setValue("");
    setType("");
    setResponsible("");
    setStatus("prospeccao");
    setDescription("");
  };

  const handleSubmit = () => {
    if (!title || !client || !value || !type || !responsible) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (isEditing && onEdit && editingOpportunity) {
      onEdit({
        ...editingOpportunity,
        title,
        client,
        value: value.startsWith("R$") ? value : `R$ ${value}`,
        type,
        responsible,
        status,
        description,
      });
      toast.success("Oportunidade atualizada com sucesso!");
    } else {
      onAdd({
        title,
        client,
        value: `R$ ${value}`,
        type,
        responsible,
        status,
        description,
      });
      toast.success("Oportunidade criada com sucesso!");
    }

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Oportunidade" : "Nova Oportunidade"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados da oportunidade."
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="value">Valor (R$) *</Label>
              <Input
                id="value"
                placeholder="450.000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

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
                <SelectItem value="prospeccao">Prospecção</SelectItem>
                <SelectItem value="qualificacao">Qualificação</SelectItem>
                <SelectItem value="proposta">Proposta Enviada</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
                <SelectItem value="ganha">Ganha</SelectItem>
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