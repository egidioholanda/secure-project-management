import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Camera } from "lucide-react";
import type { Device, DeviceCategory } from "@/types/project";

interface ProductCardProps {
  device: Device;
  category: DeviceCategory | undefined;
  onEdit: (device: Device) => void;
  onDelete: (device: Device) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export const ProductCard = ({
  device,
  category,
  onEdit,
  onDelete,
}: ProductCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
      <div className="aspect-video overflow-hidden bg-muted flex items-center justify-center">
        <Camera className="w-12 h-12 text-muted-foreground/30" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {device.name}
            </h3>
            {category && (
              <Badge variant="secondary" className="mt-1">
                {category.name}
              </Badge>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          {device.brand && <p>Fabricante: {device.brand}</p>}
          {device.model && <p>Modelo: {device.model}</p>}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-lg font-bold text-primary">
              {formatPrice(device.unit_price)}
            </p>
            {device.installation_price > 0 && (
              <p className="text-xs text-muted-foreground">
                Instalação: {formatPrice(device.installation_price)}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(device)}
              className="h-8 w-8"
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(device)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
