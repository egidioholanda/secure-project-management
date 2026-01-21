import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Radio, DoorOpen, Bell, Zap, Phone, Settings, Shield, Wifi, Monitor, Lock, Eye, Lightbulb, Thermometer } from "lucide-react";
import type { Device, DeviceCategory } from "@/types/project";

const iconOptions = [
  { value: "Camera", label: "Câmera", icon: Camera },
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
interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: DeviceCategory[];
  onAddDevice: (device: Omit<Device, "id">) => Promise<unknown>;
  onAddCategory: (name: string, icon?: string) => Promise<unknown>;
}

const AddDeviceDialog = ({
  open,
  onOpenChange,
  categories,
  onAddDevice,
  onAddCategory,
}: AddDeviceDialogProps) => {
  const [tab, setTab] = useState("device");
  const [deviceForm, setDeviceForm] = useState({
    name: "",
    category_id: "",
    model: "",
    brand: "",
    description: "",
    unit_price: "",
    installation_price: "",
    icon: "Settings",
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    icon: "",
  });

  const handleAddDevice = async () => {
    if (!deviceForm.name || !deviceForm.category_id) return;

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
    });
    onOpenChange(false);
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name) return;

    await onAddCategory(categoryForm.name, categoryForm.icon || undefined);
    setCategoryForm({ name: "", icon: "" });
    setTab("device");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar ao Catálogo</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="device">Dispositivo</TabsTrigger>
            <TabsTrigger value="category">Categoria</TabsTrigger>
          </TabsList>

          <TabsContent value="device" className="space-y-4 mt-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={deviceForm.name}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, name: e.target.value })
                }
                placeholder="Nome do dispositivo"
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
                <Label>Preço Unitário (R$)</Label>
                <Input
                  type="number"
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
              <Label>Ícone</Label>
              <Select
                value={deviceForm.icon}
                onValueChange={(value) =>
                  setDeviceForm({ ...deviceForm, icon: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um ícone">
                    {deviceForm.icon && (
                      <div className="flex items-center gap-2">
                        {(() => {
                          const IconComp = iconOptions.find(i => i.value === deviceForm.icon)?.icon || Settings;
                          return <IconComp className="w-4 h-4" />;
                        })()}
                        <span>{iconOptions.find(i => i.value === deviceForm.icon)?.label}</span>
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
                value={deviceForm.description}
                onChange={(e) =>
                  setDeviceForm({ ...deviceForm, description: e.target.value })
                }
                placeholder="Descrição do dispositivo..."
                rows={2}
              />
            </div>

            <Button
              onClick={handleAddDevice}
              className="w-full bg-gradient-primary"
              disabled={!deviceForm.name || !deviceForm.category_id}
            >
              Adicionar Dispositivo
            </Button>
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
                  <SelectItem value="Camera">Câmera</SelectItem>
                  <SelectItem value="Radio">Sensor</SelectItem>
                  <SelectItem value="DoorOpen">Porta/Acesso</SelectItem>
                  <SelectItem value="Bell">Alarme</SelectItem>
                  <SelectItem value="Zap">Cerca Elétrica</SelectItem>
                  <SelectItem value="Phone">Interfone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleAddCategory}
              className="w-full bg-gradient-primary"
              disabled={!categoryForm.name}
            >
              Adicionar Categoria
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;
