import { useState, useEffect } from "react";
import { Calendar, Upload, X, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Report, ReportPhoto, TaskProgress } from "@/types/report";
import { format } from "date-fns";

interface Project {
  id: string;
  name: string;
  tasks: TaskProgress[];
}

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onSave: (report: Omit<Report, 'id' | 'createdAt'>) => void;
  editReport?: Report | null;
}

export const CreateReportDialog = ({
  open,
  onOpenChange,
  projects,
  onSave,
  editReport,
}: CreateReportDialogProps) => {
  const [selectedProject, setSelectedProject] = useState("");
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [summary, setSummary] = useState("");
  const [observations, setObservations] = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Reset/populate form when dialog opens or editReport changes
  useEffect(() => {
    if (open && editReport) {
      setSelectedProject(editReport.projectId);
      setTitle(editReport.title);
      setPeriodStart(format(editReport.period.start, "yyyy-MM-dd"));
      setPeriodEnd(format(editReport.period.end, "yyyy-MM-dd"));
      setSummary(editReport.summary);
      setObservations(editReport.observations);
      setChallenges(editReport.challenges);
      setNextSteps(editReport.nextSteps);
      setPhotos(editReport.photos);
      setSelectedTasks(editReport.tasks.map(t => t.id));
      setStatus(editReport.status);
    } else if (open && !editReport) {
      setSelectedProject("");
      setTitle("");
      setPeriodStart("");
      setPeriodEnd("");
      setSummary("");
      setObservations("");
      setChallenges("");
      setNextSteps("");
      setPhotos([]);
      setSelectedTasks([]);
      setStatus('draft');
    }
  }, [open, editReport]);

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newPhoto: ReportPhoto = {
            id: crypto.randomUUID(),
            url: event.target?.result as string,
            caption: file.name,
            createdAt: new Date(),
          };
          setPhotos(prev => [...prev, newPhoto]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleUpdateCaption = (photoId: string, caption: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, caption } : p
    ));
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSave = () => {
    if (!selectedProject || !title || !periodStart || !periodEnd) return;

    const projectData = projects.find(p => p.id === selectedProject);
    const selectedTasksData = projectData?.tasks.filter(t => selectedTasks.includes(t.id)) || [];

    onSave({
      projectId: selectedProject,
      projectName: projectData?.name || "",
      title,
      author: "Usuário Atual",
      status,
      period: {
        start: new Date(periodStart),
        end: new Date(periodEnd),
      },
      summary,
      observations,
      challenges,
      nextSteps,
      photos,
      tasks: selectedTasksData,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProject("");
    setTitle("");
    setPeriodStart("");
    setPeriodEnd("");
    setSummary("");
    setObservations("");
    setChallenges("");
    setNextSteps("");
    setPhotos([]);
    setSelectedTasks([]);
    setStatus('draft');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editReport ? "Editar Relatório" : "Novo Relatório de Progresso"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="project">Projeto</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="title">Título do Relatório</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Relatório Semanal - Semana 12"
                />
              </div>

              <div>
                <Label htmlFor="periodStart">Período Início</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="periodStart"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="periodEnd">Período Fim</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="periodEnd"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as 'draft' | 'published')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="summary">Resumo Executivo</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Visão geral do progresso do projeto neste período..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="observations">Observações Detalhadas</Label>
              <Textarea
                id="observations"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Detalhes sobre o andamento das atividades..."
                className="min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="challenges">Desafios Encontrados</Label>
              <Textarea
                id="challenges"
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder="Problemas ou desafios enfrentados durante o período..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="nextSteps">Próximos Passos</Label>
              <Textarea
                id="nextSteps"
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="Atividades planejadas para o próximo período..."
                className="min-h-[80px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4 mt-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                id="photo-upload"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Clique para fazer upload de fotos
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG até 10MB
                </span>
              </label>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border">
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemovePhoto(photo.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="p-2">
                      <Input
                        value={photo.caption}
                        onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                        placeholder="Legenda da foto"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 mt-4">
            {!selectedProjectData ? (
              <div className="text-center py-8 text-muted-foreground">
                Selecione um projeto na aba "Informações" para ver as tarefas disponíveis.
              </div>
            ) : selectedProjectData.tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Este projeto não possui tarefas cadastradas.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione as tarefas que deseja incluir no relatório:
                </p>
                {selectedProjectData.tasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedTasks.includes(task.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={() => toggleTask(task.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.assignee} • {task.progress}% concluído
                      </p>
                    </div>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!selectedProject || !title}>
            <Plus className="w-4 h-4 mr-2" />
            {editReport ? "Salvar Alterações" : "Criar Relatório"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
