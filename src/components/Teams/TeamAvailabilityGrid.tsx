import { useMemo, useRef, useEffect } from 'react';
import { format, startOfDay, isSameDay, isWeekend, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheck } from 'lucide-react';
import type { Team } from '@/types/teams';

interface ScheduleTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  team_id?: string | null;
  projectName?: string;
  progress?: number;
}

interface Props {
  teams: Team[];
  tasks: ScheduleTask[];
  startDate: Date;
  endDate: Date;
  onDayClick?: (day: Date) => void;
}

type CellVariant = 'none' | 'green' | 'blue' | 'red';

const CELL_BG: Record<CellVariant, string> = {
  none: '',
  green: 'bg-green-500/15',
  blue: 'bg-primary/15',
  red: 'bg-red-500/15',
};

const CIRCLE_BG: Record<CellVariant, string> = {
  none: '',
  green: 'bg-green-500/80',
  blue: 'bg-primary/80',
  red: 'bg-red-500/80',
};

const LABEL_W = 160; // px — matches w-40
const CELL_W  = 32;  // px — matches w-8

const TeamAvailabilityGrid = ({ teams, tasks, startDate, endDate, onDayClick }: Props) => {
  const today = startOfDay(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) }),
    [startDate, endDate],
  );

  // Auto-scroll to center "today" when the range or container changes
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const todayIdx = days.findIndex((d) => isSameDay(d, today));
    if (todayIdx < 0) return;
    const todayLeft = LABEL_W + todayIdx * CELL_W;
    container.scrollLeft = Math.max(0, todayLeft - container.clientWidth / 2 + CELL_W / 2);
  }, [days, today]);

  const activeTeams = teams.filter((t) => t.active);

  const getTasksForTeamOnDay = (teamId: string, day: Date) =>
    tasks.filter(
      (t) =>
        t.team_id === teamId &&
        startOfDay(t.startDate) <= day &&
        startOfDay(t.endDate) >= day,
    );

  const getCellVariant = (dayTasks: ScheduleTask[]): CellVariant => {
    if (dayTasks.length === 0) return 'none';
    const hasOverdue = dayTasks.some(
      (t) => (t.progress ?? 0) < 100 && startOfDay(t.endDate) <= today,
    );
    if (hasOverdue) return 'red';
    const hasActive = dayTasks.some((t) => (t.progress ?? 0) < 100);
    if (hasActive) return 'blue';
    return 'green';
  };

  if (activeTeams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <CalendarCheck className="h-10 w-10 opacity-30" />
        <p className="text-sm">Nenhuma equipe ativa para exibir disponibilidade.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
    <div ref={scrollRef} className="overflow-x-auto p-4">
      <div className="min-w-max">
        {/* Month header */}
        <div className="flex mb-1">
          <div className="w-40 flex-shrink-0 sticky left-0 z-20 bg-card" />
          {days.map((day) => {
            const isFirst = day.getDate() === 1 || isSameDay(day, days[0]);
            return (
              <div key={day.toISOString()} className="w-8 flex-shrink-0 text-center">
                {isFirst && (
                  <span className="text-[10px] text-muted-foreground font-medium capitalize">
                    {format(day, 'MMM', { locale: ptBR })}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Day numbers header */}
        <div className="flex mb-2">
          <div className="w-40 flex-shrink-0 sticky left-0 z-20 bg-card" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={[
                'w-8 flex-shrink-0 text-center text-[10px] font-medium rounded-sm',
                isSameDay(day, today)
                  ? 'bg-primary text-primary-foreground rounded'
                  : isWeekend(day)
                    ? 'text-muted-foreground/40'
                    : 'text-muted-foreground',
              ].join(' ')}
            >
              {format(day, 'd')}
            </div>
          ))}
        </div>

        {/* Team rows */}
        <div className="space-y-1">
          {activeTeams.map((team) => {
            const responsavel = team.members?.find((m) => m.role === 'responsavel');
            const respName = responsavel?.profile?.full_name ?? responsavel?.profile?.email ?? '–';

            return (
              <div key={team.id} className="flex items-center group">
                {/* Team label — sticky */}
                <div className="w-40 flex-shrink-0 pr-3 sticky left-0 z-10 bg-card">
                  <p className="text-sm font-medium truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{respName}</p>
                </div>

                {/* Day cells */}
                {days.map((day) => {
                  const dayTasks = getTasksForTeamOnDay(team.id, day);
                  const variant = getCellVariant(dayTasks);
                  const count = dayTasks.length;
                  const weekend = isWeekend(day);
                  const isPast = day < today && !isSameDay(day, today);
                  const clickable = count > 0 && !!onDayClick;

                  const tooltipLines = dayTasks.map((t) => {
                    const pct = t.progress ?? 0;
                    const status =
                      pct >= 100
                        ? '✓ Concluída'
                        : startOfDay(t.endDate) <= today
                          ? '⚠ Atrasada'
                          : `${pct}% — no prazo`;
                    return `${t.name}${t.projectName ? ` (${t.projectName})` : ''} — ${status}`;
                  });
                  if (clickable) tooltipLines.push('→ Clique para ver no cronograma');

                  return (
                    <div
                      key={day.toISOString()}
                      className={[
                        'w-8 h-8 flex-shrink-0 flex items-center justify-center',
                        'border-r border-b border-border/30',
                        weekend ? 'bg-muted/30' : '',
                        isPast && !weekend ? 'opacity-60' : '',
                        CELL_BG[variant],
                        clickable ? 'cursor-pointer hover:brightness-90 transition-all' : '',
                        isSameDay(day, today) ? 'border-l-2 border-l-primary' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={tooltipLines.length ? tooltipLines.join('\n') : undefined}
                      onClick={clickable ? () => onDayClick!(day) : undefined}
                    >
                      {count > 0 && (
                        <div
                          className={`w-5 h-5 rounded-sm flex items-center justify-center ${CIRCLE_BG[variant]}`}
                        >
                          <span className="text-[9px] text-white font-bold">{count}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-green-500/80" />
            <span>Concluída</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-primary/80" />
            <span>Em andamento (no prazo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-red-500/80" />
            <span>Atrasada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold bg-primary/80 text-white rounded-sm w-4 h-4 flex items-center justify-center">3</span>
            <span>Número = sobreposição de tarefas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-muted/30" />
            <span>Fim de semana</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-background border-l-2 border-l-primary border border-border/30" />
            <span>Hoje</span>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default TeamAvailabilityGrid;
