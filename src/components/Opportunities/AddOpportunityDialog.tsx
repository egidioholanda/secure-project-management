import { useState } from "react";
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

interface AddOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (opportunity: {
    title: string;
    client: string;
    value: string;
    type: string;
    responsible: string;
    status: "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "ganha";
    description?: string;
  }) => void;
}

export function AddOpportunityDialog({
  open,
  onOpenChange,
  onAdd,
}: AddOpportunityDialogProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("");
  const [responsible, setResponsible] = useState("");
  const [status, setStatus] = useState<"prospeccao" | "qualificacao" | "proposta" | "negociacao" | "ganha">("prospeccao");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!title || !client || !value || !type || !responsible) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    onAdd({
      title,
      client,
      value: `R$ ${value}`,
      type,
      responsible,
      status,
      description,
    });

    // Reset form
    setTitle("");
    setClient("");
    setValue("");
    setType("");
    setResponsible("");
    setStatus("prospeccao");
    setDescription("");
    
    onOpenChange(false);
    toast.success("Oportunidade criada com sucesso!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova oportunidade de negócio.
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
            <Label htmlFor="status">Status Inicial</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prospeccao">Prospecção</SelectItem>
                <SelectItem value="qualificacao">Qualificação</SelectItem>
                <SelectItem value="proposta">Proposta Enviada</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
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
            Criar Oportunidade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
