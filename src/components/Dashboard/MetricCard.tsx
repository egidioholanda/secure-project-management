import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: boolean;
}

export const MetricCard = ({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon,
  gradient = false 
}: MetricCardProps) => {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-border p-6 transition-all duration-300 hover:shadow-card",
      gradient ? "bg-gradient-primary text-primary-foreground" : "bg-card"
    )}>
      {gradient && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      )}
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            gradient ? "bg-white/20" : "bg-primary/10"
          )}>
            <Icon className={cn("w-6 h-6", gradient ? "text-primary-foreground" : "text-primary")} />
          </div>
          
          {change && (
            <span className={cn(
              "text-sm font-semibold px-2 py-1 rounded-md",
              changeType === "positive" && "text-success bg-success/10",
              changeType === "negative" && "text-destructive bg-destructive/10",
              changeType === "neutral" && "text-muted-foreground bg-muted",
              gradient && "bg-white/20 text-primary-foreground"
            )}>
              {change}
            </span>
          )}
        </div>
        
        <h3 className={cn(
          "text-sm font-medium mb-1",
          gradient ? "text-primary-foreground/80" : "text-muted-foreground"
        )}>
          {title}
        </h3>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
};
