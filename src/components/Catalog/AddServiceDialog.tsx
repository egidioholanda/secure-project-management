import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Service } from "@/types/project";

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddService: (service: Omit<Service, "id">) => Promise<void>;
}

export const AddServiceDialog = ({
  open,
  onOpenChange,
  onAddService,
}: AddServiceDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    unit_price: "",
  });

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await onAddService({
        name: form.name,
        description: form.description || null,
        unit_price: parseFloat(form.unit_price) || 0,
      });
      setForm({ name: "", description: "", unit_price: "" });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Serviço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Instalação de câmera, Manutenção..."
            />
          </div>

          <div>
            <Label>Preço (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição detalhada do serviço..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !form.name}>
            {saving ? "Salvando..." : "Adicionar Serviço"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
