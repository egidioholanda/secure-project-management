import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, AlertTriangle, Clock, CalendarCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Task } from '@/types/schedule';
import {
  getOverallProgress,
  getEstimatedDelivery,
  countByStatus,
} from '@/utils/ganttUtils';

interface ScheduleSummaryProps {
  tasks: Task[];
}

export const ScheduleSummary = ({ tasks }: ScheduleSummaryProps) => {
  const today = useMemo(() => new Date(), []);
  const overallProgress = useMemo(() => getOverallProgress(tasks), [tasks]);
  const estimatedDelivery = useMemo(() => getEstimatedDelivery(tasks), [tasks]);
  const counts = useMemo(() => countByStatus(tasks, today), [tasks, today]);

  const progressColor =
    overallProgress >= 75
      ? '#10B981'
      : overallProgress >= 40
      ? '#3B82F6'
      : overallProgress > 0
      ? '#F59E0B'
      : '#94A3B8';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overall Progress */}
      <Card className="p-4 flex items-center gap-4">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={progressColor}
              strokeWidth="3"
              strokeDasharray={`${(overallProgress / 100) * 94.25} 94.25`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: progressColor }}>
            {overallProgress}%
          </span>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Progresso Geral</p>
          <p className="text-lg font-bold text-foreground">{overallProgress}%</p>
          <p className="text-xs text-muted-foreground">{tasks.filter(t => !t.isMilestone).length} tarefa(s)</p>
        </div>
      </Card>

      {/* Estimated Delivery */}
      <Card className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CalendarCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Entrega Estimada</p>
          <p className="text-base font-bold text-foreground">
            {estimatedDelivery
              ? format(estimatedDelivery, "dd 'de' MMM yyyy", { locale: ptBR })
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {counts.completed} concluída(s)
          </p>
        </div>
      </Card>

      {/* At Risk */}
      <Card className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Em Risco</p>
          <p className="text-2xl font-bold text-amber-500">{counts['at-risk']}</p>
          <p className="text-xs text-muted-foreground">tarefa(s)</p>
        </div>
      </Card>

      {/* Overdue */}
      <Card className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Atrasadas</p>
          <p className="text-2xl font-bold text-destructive">{counts.overdue}</p>
          <p className="text-xs text-muted-foreground">tarefa(s)</p>
        </div>
      </Card>
    </div>
  );
};
