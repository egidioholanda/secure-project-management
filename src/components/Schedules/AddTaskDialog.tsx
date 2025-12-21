import { useState } from 'react';
import { Task } from '@/types/schedule';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, User, Flag, Plus } from 'lucide-react';
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

interface AddTaskDialogProps {
  projects: { id: string; name: string; color: string }[];
  onAdd: (task: Omit<Task, 'id'>) => void;
}

const defaultTask = {
  name: '',
  startDate: new Date(),
  endDate: addDays(new Date(), 7),
  progress: 0,
  assignee: '',
  projectId: '',
  projectName: '',
  color: '#3B82F6',
  isMilestone: false,
};

export const AddTaskDialog = ({ projects, onAdd }: AddTaskDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newTask, setNewTask] = useState(defaultTask);

  const handleAdd = () => {
    if (!newTask.name || !newTask.projectId) return;
    
    const project = projects.find((p) => p.id === newTask.projectId);
    if (!project) return;

    onAdd({
      ...newTask,
      projectName: project.name,
      color: project.color,
    });
    
    setNewTask(defaultTask);
    setOpen(false);
  };

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setNewTask({
        ...newTask,
        projectId,
        projectName: project.name,
        color: project.color,
      });
    }
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
          {/* Project selection */}
          <div className="space-y-2">
            <Label>Projeto</Label>
            <Select value={newTask.projectId} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    onSelect={(date) => date && setNewTask({ ...newTask, startDate: date })}
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
                    onSelect={(date) => date && setNewTask({ ...newTask, endDate: date })}
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
                value={newTask.assignee}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                className="pl-9"
                placeholder="Nome do responsável"
              />
            </div>
          </div>

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
