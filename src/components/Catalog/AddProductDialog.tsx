import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DeviceImageUpload } from "./DeviceImageUpload";
import {
  Camera,
  Video,
  Lock,
  Radio,
  Wifi,
  Settings,
  Speaker,
  Lightbulb,
  Shield,
  Monitor,
} from "lucide-react";

const iconOptions = [
  { value: "Camera", label: "Câmera", Icon: Camera },
  { value: "Video", label: "Vídeo", Icon: Video },
  { value: "Lock", label: "Cadeado", Icon: Lock },
  { value: "Radio", label: "Sensor", Icon: Radio },
  { value: "Wifi", label: "Wi-Fi", Icon: Wifi },
  { value: "Settings", label: "Configurações", Icon: Settings },
  { value: "Speaker", label: "Alto-falante", Icon: Speaker },
  { value: "Lightbulb", label: "Lâmpada", Icon: Lightbulb },
  { value: "Shield", label: "Escudo", Icon: Shield },
  { value: "Monitor", label: "Monitor", Icon: Monitor },
];

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: DeviceCategory[];
  onAddDevice: (device: Omit<Device, "id">) => Promise<unknown>;
  onAddCategory: (name: string, icon?: string) => Promise<unknown>;
}

export const AddProductDialog = ({
  open,
  onOpenChange,
  categories,
  onAddDevice,
  onAddCategory,
}: AddProductDialogProps) => {
  const [tab, setTab] = useState("device");
  const [saving, setSaving] = useState(false);

  const [deviceForm, setDeviceForm] = useState({
    name: "",
    category_id: "",
    model: "",
    brand: "",
    description: "",
    unit_price: "",
    installation_price: "",
    icon: "Settings",
    image_url: null as string | null,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    icon: "",
  });

  const handleAddDevice = async () => {
    if (!deviceForm.name || !deviceForm.category_id) return;

    setSaving(true);
    try {
      await onAddDevice({
        name: deviceForm.name,
        category_id: deviceForm.category_id,
        model: deviceForm.model || null,
        brand: deviceForm.brand || null,
        description: deviceForm.description || null,
        unit_price: parseFloat(deviceForm.unit_price) || 0,
        installation_price: parseFloat(deviceForm.installation_price) || 0,
        icon: deviceForm.icon || null,
        specifications: null,
        image_url: deviceForm.image_url,
      });

      setDeviceForm({
        name: "",
        category_id: "",
        model: "",
        brand: "",
        description: "",
        unit_price: "",
        installation_price: "",
        icon: "Settings",
        image_url: null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name) return;

    setSaving(true);
    try {
      await onAddCategory(categoryForm.name, categoryForm.icon || undefined);
      setCategoryForm({ name: "", icon: "" });
      setTab("device");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar ao Catálogo</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="device">Produto</TabsTrigger>
            <TabsTrigger value="category">Categoria</TabsTrigger>
          </TabsList>

          <TabsContent value="device" className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Imagem do Produto</Label>
              <DeviceImageUpload
                imageUrl={deviceForm.image_url}
                onImageChange={(url) =>
                  setDeviceForm({ ...deviceForm, image_url: url })
                }
              />
            </div>

            <div>
              <Label>Nome *</Label>
              <Input
                value={deviceForm.name}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, name: e.target.value })
                }
                placeholder="Nome do produto"
              />
            </div>

            <div>
              <Label>Categoria *</Label>
              <Select
                value={deviceForm.category_id}
                onValueChange={(value) =>
                  setDeviceForm({ ...deviceForm, category_id: value })
                }
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
                  value={deviceForm.brand}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, brand: e.target.value })
                  }
                  placeholder="Intelbras, Hikvision..."
                />
              </div>
              <div>
                <Label>Modelo</Label>
                <Input
                  value={deviceForm.model}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, model: e.target.value })
                  }
                  placeholder="VIP 3430..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preço Venda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deviceForm.unit_price}
                  onChange={(e) =>
                    setDeviceForm({ ...deviceForm, unit_price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Preço Instalação (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deviceForm.installation_price}
                  onChange={(e) =>
                    setDeviceForm({
                      ...deviceForm,
                      installation_price: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={deviceForm.description}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, description: e.target.value })
                }
                placeholder="Descrição do produto..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddDevice}
                disabled={saving || !deviceForm.name || !deviceForm.category_id}
              >
                {saving ? "Salvando..." : "Adicionar Produto"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="category" className="space-y-4 mt-4">
            <div>
              <Label>Nome da Categoria *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, name: e.target.value })
                }
                placeholder="Ex: Câmeras, Sensores..."
              />
            </div>

            <div>
              <Label>Ícone</Label>
              <Select
                value={categoryForm.icon}
                onValueChange={(value) =>
                  setCategoryForm({ ...categoryForm, icon: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ícone" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.Icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTab("device")}>
                Voltar
              </Button>
              <Button
                onClick={handleAddCategory}
                disabled={saving || !categoryForm.name}
              >
                {saving ? "Salvando..." : "Adicionar Categoria"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
