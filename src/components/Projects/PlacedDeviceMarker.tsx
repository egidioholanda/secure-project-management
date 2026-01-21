import { useState, useRef } from "react";
import { Camera, Radio, DoorOpen, Bell, Zap, Phone, Settings, Trash2, RotateCw, Shield, Wifi, Monitor, Lock, Eye, Lightbulb, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PlacedDevice } from "@/types/project";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Camera: Camera,
  Radio: Radio,
  DoorOpen: DoorOpen,
  Bell: Bell,
  Zap: Zap,
  Phone: Phone,
  Fingerprint: DoorOpen,
  Shield: Shield,
  Wifi: Wifi,
  Monitor: Monitor,
  Lock: Lock,
  Eye: Eye,
  Lightbulb: Lightbulb,
  Thermometer: Thermometer,
  Settings: Settings,
};

interface PlacedDeviceMarkerProps {
  placedDevice: PlacedDevice;
  onDelete: () => void;
  onRotate: () => void;
  onDrag: (x: number, y: number) => void;
  zoom: number;
}

const PlacedDeviceMarker = ({
  placedDevice,
  onDelete,
  onRotate,
  onDrag,
  zoom,
}: PlacedDeviceMarkerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const device = placedDevice.device;
  const IconComponent = device?.icon ? iconMap[device.icon] || Settings : Settings;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - placedDevice.x_position * zoom,
      y: e.clientY - placedDevice.y_position * zoom,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = (moveEvent.clientX - dragStartRef.current.x) / zoom;
      const newY = (moveEvent.clientY - dragStartRef.current.y) / zoom;
      
      if (markerRef.current) {
        markerRef.current.style.left = `${newX}px`;
        markerRef.current.style.top = `${newY}px`;
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsDragging(false);
      const newX = (upEvent.clientX - dragStartRef.current.x) / zoom;
      const newY = (upEvent.clientY - dragStartRef.current.y) / zoom;
      onDrag(newX, newY);
      
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          ref={markerRef}
          className={cn(
            "absolute flex items-center justify-center w-10 h-10 -ml-5 -mt-5 rounded-full bg-primary text-primary-foreground shadow-lg cursor-move transition-transform hover:scale-110",
            isDragging && "scale-110 opacity-80"
          )}
          style={{
            left: placedDevice.x_position,
            top: placedDevice.y_position,
            transform: `rotate(${placedDevice.rotation}deg)`,
          }}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          <IconComponent className="w-5 h-5" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" side="right">
        <div className="space-y-2">
          <p className="font-medium text-sm">{device?.name}</p>
          {device?.brand && (
            <p className="text-xs text-muted-foreground">
              {device.brand} - {device.model}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setIsOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PlacedDeviceMarker;
