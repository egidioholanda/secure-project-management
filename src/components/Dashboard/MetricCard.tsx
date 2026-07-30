import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: boolean;
  onClick?: () => void;
}

export const MetricCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  gradient = false,
  onClick,
}: MetricCardProps) => {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border p-6 transition-all duration-300 hover:shadow-card text-left w-full",
        gradient ? "bg-gradient-primary text-primary-foreground" : "bg-card",
        onClick && "cursor-pointer hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
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
        <p className={cn("text-3xl font-bold", onClick && "underline decoration-dotted decoration-muted-foreground/50 underline-offset-4")}>
          {value}
        </p>
      </div>
    </Comp>
  );
};
