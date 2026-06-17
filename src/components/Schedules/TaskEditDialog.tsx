import { useState, useEffect } from 'react';
import { Task } from '@/types/schedule';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, Flag, Trash2, UsersRound } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Team } from '@/types/teams';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  teams?: Team[];
}

export const TaskEditDialog = ({
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
  teams = [],
}: TaskEditDialogProps) => {
  const [editedTask, setEditedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task });
    }
  }, [task]);

  if (!editedTask) return null;

  const handleSave = () => {
    if (editedTask) {
      onSave(editedTask);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (editedTask) {
      onDelete(editedTask.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: editedTask.color }}
            />
            Editar Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Tarefa</Label>
            <Input
              id="name"
              value={editedTask.name}
              onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
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
                      !editedTask.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(editedTask.startDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedTask.startDate}
                    onSelect={(date) => date && setEditedTask({ ...editedTask, startDate: date })}
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
                      !editedTask.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(editedTask.endDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedTask.endDate}
                    onSelect={(date) => date && setEditedTask({ ...editedTask, endDate: date })}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Responsável</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="assignee"
                value={editedTask.assignee || ''}
                onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
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
                value={editedTask.teamId ?? '__none'}
                onValueChange={(v) => setEditedTask({ ...editedTask, teamId: v === '__none' ? null : v })}
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

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Progresso</Label>
              <span className="text-sm font-medium text-foreground">{editedTask.progress}%</span>
            </div>
            <Slider
              value={[editedTask.progress]}
              onValueChange={(value) => setEditedTask({ ...editedTask, progress: value[0] })}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Milestone toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="milestone">Marco do Projeto</Label>
            </div>
            <Switch
              id="milestone"
              checked={editedTask.isMilestone || false}
              onCheckedChange={(checked) => setEditedTask({ ...editedTask, isMilestone: checked })}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
