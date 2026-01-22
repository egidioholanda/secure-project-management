import { Bell, AlertTriangle, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTaskNotifications, TaskNotification } from "@/hooks/useTaskNotifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const NotificationItem = ({ 
  notification, 
  onNavigate 
}: { 
  notification: TaskNotification;
  onNavigate: () => void;
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "today":
        return <Clock className="h-4 w-4 text-warning" />;
      case "upcoming":
        return <Calendar className="h-4 w-4 text-primary" />;
    }
  };

  const getMessage = () => {
    switch (notification.type) {
      case "overdue":
        return `Atrasada há ${Math.abs(notification.daysRemaining)} dia${Math.abs(notification.daysRemaining) !== 1 ? "s" : ""}`;
      case "today":
        return "Vence hoje";
      case "upcoming":
        return `Vence em ${notification.daysRemaining} dia${notification.daysRemaining !== 1 ? "s" : ""}`;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case "overdue":
        return "bg-destructive/10 border-destructive/20";
      case "today":
        return "bg-warning/10 border-warning/20";
      case "upcoming":
        return "bg-primary/10 border-primary/20";
    }
  };

  return (
    <button
      onClick={onNavigate}
      className={`w-full p-3 rounded-lg border ${getBgColor()} hover:opacity-80 transition-opacity text-left`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{notification.taskName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {notification.projectName}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-medium">{getMessage()}</span>
            <span className="text-xs text-muted-foreground">
              {format(notification.endDate, "dd/MM", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const { 
    notifications, 
    loading, 
    overdueCount, 
    todayCount, 
    totalCount,
    hasBeenSeen,
    markAsSeen 
  } = useTaskNotifications();

  const handleOpenChange = (open: boolean) => {
    if (open && totalCount > 0) {
      markAsSeen();
    }
  };

  const handleNavigate = () => {
    navigate("/cronogramas");
  };

  // Show badge only if there are notifications AND they haven't been seen today
  const showBadge = totalCount > 0 && !hasBeenSeen;

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {showBadge && (
            <span 
              className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
                overdueCount > 0 
                  ? "bg-destructive text-destructive-foreground" 
                  : "bg-accent text-accent-foreground"
              }`}
            >
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Notificações</h3>
          <p className="text-sm text-muted-foreground">
            Tarefas que precisam de atenção
          </p>
        </div>

        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Carregando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as tarefas estão em dia!
            </p>
          </div>
        ) : (
          <>
            {/* Summary badges */}
            <div className="p-3 border-b border-border flex gap-2 flex-wrap">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {todayCount > 0 && (
                <Badge className="bg-warning/20 text-warning-foreground hover:bg-warning/30 text-xs">
                  {todayCount} para hoje
                </Badge>
              )}
            </div>

            <ScrollArea className="max-h-[300px]">
              <div className="p-2 space-y-2">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleNavigate}
              >
                Ver cronogramas
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
