import { useState } from "react";
import { Plus, Camera, Radio, DoorOpen, Bell, Zap, Phone, Settings, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useDevices } from "@/hooks/useDevices";
import type { Device } from "@/types/project";
import AddDeviceDialog from "./AddDeviceDialog";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Camera: Camera,
  Radio: Radio,
  DoorOpen: DoorOpen,
  Bell: Bell,
  Zap: Zap,
  Phone: Phone,
  Fingerprint: DoorOpen,
};

interface DeviceCatalogProps {
  selectedDevice: Device | null;
  onSelectDevice: (device: Device | null) => void;
}

const DeviceCatalog = ({ selectedDevice, onSelectDevice }: DeviceCatalogProps) => {
  const { devices, categories, loading, addDevice, addCategory } = useDevices();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const devicesByCategory = categories.map((category) => ({
    ...category,
    devices: filteredDevices.filter((d) => d.category_id === category.id),
  }));

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Settings;
    return iconMap[iconName] || Settings;
  };

  return (
    <Card className="w-80 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Catálogo</h3>
          <Button size="sm" variant="ghost" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar dispositivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedDevice && (
          <div className="mt-3 p-2 bg-primary/10 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-primary">
              Selecionado: {selectedDevice.name}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectDevice(null)}
              className="h-6 px-2 text-xs"
            >
              Limpar
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-4">Carregando...</p>
          ) : (
            <Accordion type="multiple" defaultValue={categories.map((c) => c.id)}>
              {devicesByCategory.map((category) => {
                const IconComponent = getIcon(category.icon);
                return (
                  <AccordionItem key={category.id} value={category.id}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" />
                        <span>{category.name}</span>
                        <span className="text-muted-foreground">
                          ({category.devices.length})
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {category.devices.map((device) => (
                          <div
                            key={device.id}
                            onClick={() => onSelectDevice(device)}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary",
                              selectedDevice?.id === device.id
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            )}
                          >
                            <div className="font-medium text-sm">{device.name}</div>
                            {device.model && (
                              <div className="text-xs text-muted-foreground">
                                {device.brand} - {device.model}
                              </div>
                            )}
                            <div className="text-xs text-primary mt-1">
                              {formatPrice(device.unit_price)}
                            </div>
                          </div>
                        ))}
                        {category.devices.length === 0 && (
                          <p className="text-sm text-muted-foreground py-2 text-center">
                            Nenhum dispositivo
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </ScrollArea>

      <AddDeviceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categories={categories}
        onAddDevice={addDevice}
        onAddCategory={addCategory}
      />
    </Card>
  );
};

export default DeviceCatalog;
