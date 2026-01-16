import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Device, DeviceCategory } from "@/types/project";

interface EditDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: Device | null;
  categories: DeviceCategory[];
  onUpdate: (id: string, updates: Partial<Omit<Device, "id" | "specifications">>) => Promise<void>;
}

export const EditDeviceDialog = ({
  open,
  onOpenChange,
  device,
  categories,
  onUpdate,
}: EditDeviceDialogProps) => {
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    model: "",
    brand: "",
    description: "",
    unit_price: "",
    installation_price: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (device) {
      setForm({
        name: device.name,
        category_id: device.category_id || "",
        model: device.model || "",
        brand: device.brand || "",
        description: device.description || "",
        unit_price: device.unit_price?.toString() || "0",
        installation_price: device.installation_price?.toString() || "0",
      });
    }
  }, [device]);

  const handleSave = async () => {
    if (!device || !form.name) return;

    setSaving(true);
    try {
      await onUpdate(device.id, {
        name: form.name,
        category_id: form.category_id || null,
        model: form.model || null,
        brand: form.brand || null,
        description: form.description || null,
        unit_price: parseFloat(form.unit_price) || 0,
        installation_price: parseFloat(form.installation_price) || 0,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do produto"
            />
          </div>

          <div>
            <Label>Categoria</Label>
            <Select
              value={form.category_id}
              onValueChange={(value) => setForm({ ...form, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Marca</Label>
              <Input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="Intelbras, Hikvision..."
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="VIP 3430..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Preço Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Preço Instalação (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.installation_price}
                onChange={(e) => setForm({ ...form, installation_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição do produto..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.name}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
