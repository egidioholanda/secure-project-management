import { useState, useRef } from "react";
import { Radio, DoorOpen, Bell, Zap, Phone, Settings, Trash2, RotateCw, Shield, Wifi, Monitor, Lock, Eye, Lightbulb, Thermometer, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type { PlacedDevice } from "@/types/project";
import { cn } from "@/lib/utils";
import BulletCameraIcon from "./BulletCameraIcon";
import DomeCameraIcon from "./DomeCameraIcon";
import PTZCameraIcon from "./PTZCameraIcon";
import SpeedDomeCameraIcon from "./SpeedDomeCameraIcon";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Camera: BulletCameraIcon,
  DomeCamera: DomeCameraIcon,
  PTZCamera: PTZCameraIcon,
  SpeedDome: SpeedDomeCameraIcon,
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

// Icons that should display FOV cone (cameras, sensors with directional coverage)
const FOV_ICONS = ["Camera", "DomeCamera", "PTZCamera", "SpeedDome", "Eye"];

interface PlacedDeviceMarkerProps {
  placedDevice: PlacedDevice;
  onDelete: () => void;
  onRotate: () => void;
  onDrag: (x: number, y: number) => void;
  onScaleChange: (scale: number) => void;
  zoom: number;
}

const PlacedDeviceMarker = ({
  placedDevice,
  onDelete,
  onRotate,
  onDrag,
  onScaleChange,
  zoom,
}: PlacedDeviceMarkerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const device = placedDevice.device;
  const IconComponent = device?.icon ? iconMap[device.icon] || Settings : Settings;
  const showFOV = device?.icon && FOV_ICONS.includes(device.icon);
  const scale = placedDevice.scale || 1;

  // FOV cone dimensions based on scale
  const fovLength = 80 * scale;
  const fovWidth = 60 * scale;

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

  const handleScaleChange = (value: number[]) => {
    onScaleChange(value[0]);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          ref={markerRef}
          className={cn(
            "absolute cursor-move transition-transform",
            isDragging && "opacity-80"
          )}
          style={{
            left: placedDevice.x_position,
            top: placedDevice.y_position,
          }}
          onMouseDown={handleMouseDown}
          onClick={(e) => e.stopPropagation()}
        >
          {/* FOV Cone - rendered behind the icon */}
          {showFOV && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                transform: `rotate(${placedDevice.rotation}deg)`,
                transformOrigin: "0 0",
              }}
            >
              <svg
                width={fovLength + 10}
                height={fovWidth + 10}
                className="overflow-visible"
                style={{
                  position: "absolute",
                  left: 0,
                  top: -fovWidth / 2 - 5,
                }}
              >
                {/* FOV cone shape */}
                <path
                  d={`M 5 ${fovWidth / 2 + 5} L ${fovLength + 5} 5 L ${fovLength + 5} ${fovWidth + 5} Z`}
                  fill="hsl(var(--primary) / 0.15)"
                  stroke="hsl(var(--primary) / 0.5)"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {/* Center line */}
                <line
                  x1="5"
                  y1={fovWidth / 2 + 5}
                  x2={fovLength + 5}
                  y2={fovWidth / 2 + 5}
                  stroke="hsl(var(--primary) / 0.3)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              </svg>
            </div>
          )}

          {/* Device Icon */}
          <div
            className={cn(
              "flex items-center justify-center w-7 h-7 -ml-3.5 -mt-3.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110",
              isDragging && "scale-110"
            )}
            style={{
              transform: `rotate(${placedDevice.rotation}deg)`,
            }}
          >
            <IconComponent className="w-4 h-4" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" side="right">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-sm">{device?.name}</p>
            {device?.brand && (
              <p className="text-xs text-muted-foreground">
                {device.brand} - {device.model}
              </p>
            )}
          </div>

          {/* Scale control for FOV devices */}
          {showFOV && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cobertura</span>
                <span className="text-xs font-medium">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onScaleChange(Math.max(0.3, scale - 0.1));
                  }}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Slider
                  value={[scale]}
                  onValueChange={handleScaleChange}
                  min={0.3}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onScaleChange(Math.min(3, scale + 0.1));
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
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
