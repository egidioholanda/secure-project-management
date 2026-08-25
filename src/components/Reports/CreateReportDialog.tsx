import { useState, useEffect } from "react";
import { CalendarIcon, Upload, Plus, Trash2, Loader2, ChevronsUpDown, Check } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Report, ReportPhoto, TaskProgress } from "@/types/report";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  tasks: TaskProgress[];
  isMaintenanceClient?: boolean;
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
  const { profile, user } = useAuthContext();
  const [selectedProject, setSelectedProject] = useState("");
  const [projectComboOpen, setProjectComboOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [summary, setSummary] = useState("");
  const [observations, setObservations] = useState("");
  const [challenges, setChallenges] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Reset/populate form when dialog opens or editReport changes
  useEffect(() => {
    if (open && editReport) {
      setSelectedProject(editReport.projectId);
      setTitle(editReport.title);
      setPeriodStart(editReport.period.start);
      setPeriodEnd(editReport.period.end);
      setSummary(editReport.summary);
      setObservations(editReport.observations);
      setChallenges(editReport.challenges);
      setNextSteps(editReport.nextSteps);
      setPhotos(editReport.photos);
      const projectData = projects.find(p => p.id === editReport.projectId);
      const matchedIds = editReport.tasks.map(t => {
        const scheduleTask = projectData?.tasks.find(st => st.name === t.name);
        return scheduleTask?.id ?? t.id;
      });
      setSelectedTasks(matchedIds);
      setStatus(editReport.status);
    } else if (open && !editReport) {
      setSelectedProject("");
      setTitle("");
      setPeriodStart(null);
      setPeriodEnd(null);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploads = await Promise.all(
        Array.from(files).map(async (file) => {
          const ext = file.name.split(".").pop();
          const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
          const { error } = await supabase.storage
            .from("report-photos")
            .upload(path, file, { contentType: file.type });
          if (error) throw error;
          const { data: urlData } = supabase.storage
            .from("report-photos")
            .getPublicUrl(path);
          return {
            id: crypto.randomUUID(),
            url: urlData.publicUrl,
            // sem legenda: o nome do arquivo da câmera não descreve a foto
            caption: "",
            createdAt: new Date(),
          } as ReportPhoto;
        })
      );
      setPhotos(prev => [...prev, ...uploads]);
    } catch {
      toast.error("Erro ao fazer upload das fotos");
    } finally {
      setUploadingPhotos(false);
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
      author: profile?.full_name || user?.email || "Usuário Atual",
      status,
      period: {
        start: periodStart,
        end: periodEnd,
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
    setPeriodStart(null);
    setPeriodEnd(null);
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
                <Label htmlFor="project">Cliente / Projeto</Label>
                <Popover open={projectComboOpen} onOpenChange={setProjectComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="project"
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectComboOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {selectedProject
                          ? projects.find(p => p.id === selectedProject)?.name
                          : "Selecione um cliente ou projeto"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente ou projeto..." />
                      <CommandList>
                        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
                        {projects.filter(p => !p.isMaintenanceClient).length > 0 && (
                          <CommandGroup heading="Projetos">
                            {projects.filter(p => !p.isMaintenanceClient).map(project => (
                              <CommandItem
                                key={project.id}
                                value={project.name}
                                onSelect={() => { setSelectedProject(project.id); setProjectComboOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedProject === project.id ? "opacity-100" : "opacity-0")} />
                                {project.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                        {projects.filter(p => p.isMaintenanceClient).length > 0 && (
                          <>
                            <CommandSeparator />
                            <CommandGroup heading="Manutenção">
                              {projects.filter(p => p.isMaintenanceClient).map(project => (
                                <CommandItem
                                  key={project.id}
                                  value={project.name}
                                  onSelect={() => { setSelectedProject(project.id); setProjectComboOpen(false); }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedProject === project.id ? "opacity-100" : "opacity-0")} />
                                  {project.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

              <div className="space-y-1">
                <Label>Período Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodStart && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodStart
                        ? format(periodStart, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={periodStart ?? undefined}
                      onSelect={(date) => date && setPeriodStart(date)}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label>Período Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodEnd && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodEnd
                        ? format(periodEnd, "dd/MM/yyyy", { locale: ptBR })
                        : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={periodEnd ?? undefined}
                      onSelect={(date) => date && setPeriodEnd(date)}
                      initialFocus
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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
                className={`cursor-pointer flex flex-col items-center gap-2 ${uploadingPhotos ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {uploadingPhotos
                    ? <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    : <Upload className="w-6 h-6 text-primary" />}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {uploadingPhotos ? "Enviando fotos..." : "Clique para fazer upload de fotos"}
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG até 10MB
                </span>
              </label>
            </div>

            {photos.length > 0 && photos.some((p) => !p.caption.trim()) && (
              <p className="text-xs text-muted-foreground">
                {photos.filter((p) => !p.caption.trim()).length} de {photos.length}{" "}
                {photos.filter((p) => !p.caption.trim()).length === 1 ? "foto" : "fotos"}{" "}
                sem nome. Fotos sem nome aparecem no relatório sem legenda.
              </p>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border">
                    <img
                      src={photo.url}
                      alt={photo.caption || "Foto do relatório"}
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
                    <div className="p-2 space-y-1">
                      <Label
                        htmlFor={`caption-${photo.id}`}
                        className="text-[11px] text-muted-foreground"
                      >
                        Nome da foto
                      </Label>
                      <Input
                        id={`caption-${photo.id}`}
                        value={photo.caption}
                        onChange={(e) => handleUpdateCaption(photo.id, e.target.value)}
                        placeholder="Ex: Câmera instalada no portão"
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
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Selecione as tarefas que deseja incluir no relatório:
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = selectedProjectData.tasks.map(t => t.id);
                      const allSelected = allIds.every(id => selectedTasks.includes(id));
                      setSelectedTasks(allSelected ? [] : allIds);
                    }}
                  >
                    {selectedProjectData.tasks.every(t => selectedTasks.includes(t.id))
                      ? "Desmarcar Todas"
                      : "Selecionar Todas"}
                  </Button>
                </div>
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
