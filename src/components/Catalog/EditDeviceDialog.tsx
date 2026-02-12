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
import { Radio, DoorOpen, Bell, Zap, Phone, Settings, Shield, Wifi, Monitor, Lock, Eye, Lightbulb, Thermometer } from "lucide-react";
import type { Device, DeviceCategory } from "@/types/project";
import { DeviceImageUpload } from "./DeviceImageUpload";
import BulletCameraIcon from "@/components/Projects/BulletCameraIcon";
import DomeCameraIcon from "@/components/Projects/DomeCameraIcon";
import PTZCameraIcon from "@/components/Projects/PTZCameraIcon";
import SpeedDomeCameraIcon from "@/components/Projects/SpeedDomeCameraIcon";

const iconOptions = [
  { value: "Camera", label: "Câmera Bullet", icon: BulletCameraIcon },
  { value: "DomeCamera", label: "Câmera Dome", icon: DomeCameraIcon },
  { value: "PTZCamera", label: "Câmera PTZ", icon: PTZCameraIcon },
  { value: "SpeedDome", label: "Speed Dome", icon: SpeedDomeCameraIcon },
  { value: "Radio", label: "Sensor", icon: Radio },
  { value: "DoorOpen", label: "Porta/Acesso", icon: DoorOpen },
  { value: "Bell", label: "Alarme", icon: Bell },
  { value: "Zap", label: "Cerca Elétrica", icon: Zap },
  { value: "Phone", label: "Interfone", icon: Phone },
  { value: "Shield", label: "Escudo", icon: Shield },
  { value: "Wifi", label: "Wi-Fi", icon: Wifi },
  { value: "Monitor", label: "Monitor", icon: Monitor },
  { value: "Lock", label: "Fechadura", icon: Lock },
  { value: "Eye", label: "Olho", icon: Eye },
  { value: "Lightbulb", label: "Iluminação", icon: Lightbulb },
  { value: "Thermometer", label: "Temperatura", icon: Thermometer },
  { value: "Settings", label: "Genérico", icon: Settings },
];

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
    icon: "",
    image_url: null as string | null,
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
        icon: device.icon || "Settings",
        image_url: device.image_url || null,
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
        icon: form.icon || null,
        image_url: form.image_url,
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

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <Label>Imagem do Produto</Label>
            <DeviceImageUpload
              imageUrl={form.image_url}
              onImageChange={(url) => setForm({ ...form, image_url: url })}
              deviceId={device?.id}
            />
          </div>

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
            <Label>Ícone</Label>
            <Select
              value={form.icon}
              onValueChange={(value) => setForm({ ...form, icon: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um ícone">
                  {form.icon && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComp = iconOptions.find(i => i.value === form.icon)?.icon || Settings;
                        return <IconComp className="w-4 h-4" />;
                      })()}
                      <span>{iconOptions.find(i => i.value === form.icon)?.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
