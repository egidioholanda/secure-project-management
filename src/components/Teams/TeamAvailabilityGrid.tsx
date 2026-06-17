import { useMemo } from 'react';
import { addDays, format, startOfDay, isSameDay, isWeekend, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, CalendarX } from 'lucide-react';
import type { Team } from '@/types/teams';

interface ScheduleTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  team_id?: string | null;
  projectName?: string;
}

interface Props {
  teams: Team[];
  tasks: ScheduleTask[];
}

const DAYS_AHEAD = 30;

const TeamAvailabilityGrid = ({ teams, tasks }: Props) => {
  const today = startOfDay(new Date());
  const days = useMemo(
    () => eachDayOfInterval({ start: today, end: addDays(today, DAYS_AHEAD - 1) }),
    [today],
  );

  const activeTeams = teams.filter((t) => t.active);

  const getTasksForTeamOnDay = (teamId: string, day: Date) =>
    tasks.filter(
      (t) =>
        t.team_id === teamId &&
        !isWeekend(day) &&
        startOfDay(t.startDate) <= day &&
        startOfDay(t.endDate) >= day,
    );

  if (activeTeams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <CalendarCheck className="h-10 w-10 opacity-30" />
        <p className="text-sm">Nenhuma equipe ativa para exibir disponibilidade.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Month header */}
        <div className="flex mb-1">
          <div className="w-40 flex-shrink-0" />
          {days.map((day) => {
            const isFirst = day.getDate() === 1 || isSameDay(day, today);
            return (
              <div key={day.toISOString()} className="w-8 flex-shrink-0 text-center">
                {isFirst && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {format(day, 'MMM', { locale: ptBR })}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Day numbers header */}
        <div className="flex mb-2">
          <div className="w-40 flex-shrink-0" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={`w-8 flex-shrink-0 text-center text-[10px] font-medium rounded-sm
                ${isSameDay(day, today) ? 'bg-primary text-primary-foreground rounded' : ''}
                ${isWeekend(day) ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
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
                {/* Team label */}
                <div className="w-40 flex-shrink-0 pr-3">
                  <p className="text-sm font-medium truncate">{team.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{respName}</p>
                </div>

                {/* Day cells */}
                {days.map((day) => {
                  const dayTasks = getTasksForTeamOnDay(team.id, day);
                  const busy = dayTasks.length > 0;
                  const weekend = isWeekend(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={`w-8 h-8 flex-shrink-0 flex items-center justify-center
                        border-r border-b border-border/30 relative group/cell
                        ${weekend ? 'bg-muted/30' : ''}
                        ${busy ? 'bg-primary/15 cursor-pointer' : ''}
                        ${isSameDay(day, today) ? 'border-l-2 border-l-primary' : ''}`}
                      title={
                        busy
                          ? dayTasks.map((t) => `${t.name}${t.projectName ? ` (${t.projectName})` : ''}`).join('\n')
                          : undefined
                      }
                    >
                      {busy && (
                        <div className="w-5 h-5 rounded-sm bg-primary/80 flex items-center justify-center">
                          <span className="text-[9px] text-primary-foreground font-bold">
                            {dayTasks.length}
                          </span>
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
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-primary/80" />
            <span>Ocupado (número = tarefas)</span>
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
  );
};

export default TeamAvailabilityGrid;
