import { useState } from 'react';
import { Task } from '@/types/schedule';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, Flag, Plus, UsersRound, Clock, Wrench } from 'lucide-react';
import type { Team } from '@/types/teams';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const CONTRACT_CLIENT_COLOR = '#8B5CF6';

type SourceType = 'project' | 'client';

interface AddTaskDialogProps {
  projects: { id: string; name: string; color: string }[];
  contractClients?: { id: string; name: string }[];
  onAdd: (task: Omit<Task, 'id'>) => void;
  teams?: Team[];
}

const DEFAULT_DURATION = 7; // dias
const HOURS_PER_DAY = 8;

const defaultTask = {
  name: '',
  startDate: new Date(),
  endDate: addDays(new Date(), DEFAULT_DURATION - 1),
  progress: 0,
  assignee: '',
  teamId: null as string | null,
  projectId: '',
  projectName: '',
  color: '#3B82F6',
  isMilestone: false,
};

export const AddTaskDialog = ({ projects, contractClients = [], onAdd, teams = [] }: AddTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newTask, setNewTask] = useState(defaultTask);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [durationUnit, setDurationUnit] = useState<'days' | 'hours'>('days');
  const [sourceType, setSourceType] = useState<SourceType>('project');

  const durationToDays = (value: number, unit: 'days' | 'hours') =>
    unit === 'days' ? value - 1 : Math.max(0, Math.ceil(value / HOURS_PER_DAY) - 1);

  const handleDurationChange = (raw: string) => {
    const value = Math.max(1, parseInt(raw) || 1);
    setDuration(value);
    setNewTask((prev) => ({ ...prev, endDate: addDays(prev.startDate, durationToDays(value, durationUnit)) }));
  };

  const handleUnitChange = (unit: 'days' | 'hours') => {
    if (unit === durationUnit) return;
    const converted =
      unit === 'hours' ? Math.max(1, duration * HOURS_PER_DAY) : Math.max(1, Math.ceil(duration / HOURS_PER_DAY));
    setDuration(converted);
    setDurationUnit(unit);
  };

  const handleStartDateChange = (date: Date) => {
    setNewTask((prev) => ({ ...prev, startDate: date, endDate: addDays(date, durationToDays(duration, durationUnit)) }));
  };

  const handleEndDateChange = (date: Date) => {
    const diff = Math.max(1, differenceInCalendarDays(date, newTask.startDate) + 1);
    setDuration(durationUnit === 'hours' ? diff * HOURS_PER_DAY : diff);
    setNewTask((prev) => ({ ...prev, endDate: date }));
  };

  const handleSourceTypeChange = (type: SourceType) => {
    setSourceType(type);
    setNewTask((prev) => ({ ...prev, projectId: '', projectName: '' }));
  };

  const handleAdd = () => {
    if (!newTask.name || !newTask.projectId) return;

    if (sourceType === 'project') {
      const project = projects.find((p) => p.id === newTask.projectId);
      if (!project) return;
      onAdd({ ...newTask, projectName: project.name, color: project.color });
    } else {
      const client = contractClients.find((c) => c.id === newTask.projectId);
      if (!client) return;
      onAdd({ ...newTask, projectName: client.name, color: CONTRACT_CLIENT_COLOR });
    }

    setNewTask(defaultTask);
    setDuration(DEFAULT_DURATION);
    setDurationUnit('days');
    setSourceType('project');
    setOpen(false);
  };

  const handleProjectChange = (projectId: string) => {
    if (sourceType === 'project') {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setNewTask({ ...newTask, projectId, projectName: project.name, color: project.color });
      }
    } else {
      const client = contractClients.find((c) => c.id === projectId);
      if (client) {
        setNewTask({ ...newTask, projectId: client.id, projectName: client.name, color: CONTRACT_CLIENT_COLOR });
      }
    }
  };

  const handleTeamChange = (v: string) => {
    const teamId = v === '__none' ? null : v;
    let assignee = newTask.assignee;
    if (teamId) {
      const team = teams.find((t) => t.id === teamId);
      const responsavel = team?.members?.find((m) => m.role === 'responsavel');
      if (responsavel) {
        assignee = responsavel.profile?.full_name || responsavel.profile?.email || assignee;
      }
    }
    setNewTask({ ...newTask, teamId, assignee });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Source type toggle */}
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => handleSourceTypeChange('project')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors',
                sourceType === 'project'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              Projeto
            </button>
            <button
              type="button"
              onClick={() => handleSourceTypeChange('client')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm border-l border-input transition-colors',
                sourceType === 'client'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              <Wrench className="h-3.5 w-3.5" />
              Cliente Contrato
            </button>
          </div>

          {/* Project / Client selection */}
          <div className="space-y-2">
            <Label>{sourceType === 'project' ? 'Projeto' : 'Cliente Contrato'}</Label>
            {sourceType === 'project' ? (
              <Select value={newTask.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={newTask.projectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {contractClients.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      Nenhum cliente com contrato ativo
                    </SelectItem>
                  ) : (
                    contractClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CONTRACT_CLIENT_COLOR }} />
                          {client.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Task name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Tarefa</Label>
            <Input
              id="name"
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              placeholder="Digite o nome da tarefa"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newTask.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(newTask.startDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newTask.startDate}
                    onSelect={(date) => date && handleStartDateChange(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newTask.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(newTask.endDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newTask.endDate}
                    onSelect={(date) => date && handleEndDateChange(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Duração
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-28"
              />
              <div className="flex rounded-md border border-input overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleUnitChange('days')}
                  className={cn(
                    "px-3 py-2 text-sm transition-colors",
                    durationUnit === 'days'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  Dias
                </button>
                <button
                  type="button"
                  onClick={() => handleUnitChange('hours')}
                  className={cn(
                    "px-3 py-2 text-sm transition-colors border-l border-input",
                    durationUnit === 'hours'
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  Horas
                </button>
              </div>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Responsável</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="assignee"
                value={newTask.assignee}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                className="pl-9"
                placeholder="Nome do responsável"
              />
            </div>
          </div>

          {/* Team */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <UsersRound className="h-3.5 w-3.5 text-muted-foreground" /> Equipe
              </Label>
              <Select
                value={newTask.teamId ?? '__none'}
                onValueChange={handleTeamChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem equipe</SelectItem>
                  {teams.filter((t) => t.active).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Milestone toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="milestone">Marco do Projeto</Label>
            </div>
            <Switch
              id="milestone"
              checked={newTask.isMilestone}
              onCheckedChange={(checked) => setNewTask({ ...newTask, isMilestone: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!newTask.name || !newTask.projectId}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
