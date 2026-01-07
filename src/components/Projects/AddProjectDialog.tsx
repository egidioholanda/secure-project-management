import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export interface Project {
  id: string;
  name: string;
  client: string;
  type: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
  manager: string;
  value: string;
  address?: string;
}

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProject: (project: Project) => void;
  editingProject?: Project | null;
}

const AddProjectDialog = ({
  open,
  onOpenChange,
  onAddProject,
  editingProject,
}: AddProjectDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    type: "",
    status: "planning",
    progress: 0,
    startDate: "",
    endDate: "",
    manager: "",
    value: "",
    address: "",
  });

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        client: editingProject.client,
        type: editingProject.type,
        status: editingProject.status,
        progress: editingProject.progress,
        startDate: editingProject.startDate,
        endDate: editingProject.endDate,
        manager: editingProject.manager,
        value: editingProject.value,
        address: editingProject.address || "",
      });
    } else {
      setFormData({
        name: "",
        client: "",
        type: "",
        status: "planning",
        progress: 0,
        startDate: "",
        endDate: "",
        manager: "",
        value: "",
        address: "",
      });
    }
  }, [editingProject, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.client || !formData.type) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    const project: Project = {
      id: editingProject?.id || Date.now().toString(),
      name: formData.name,
      client: formData.client,
      type: formData.type,
      status: formData.status,
      progress: formData.progress,
      startDate: formData.startDate,
      endDate: formData.endDate,
      manager: formData.manager,
      value: formData.value,
      address: formData.address,
    };

    onAddProject(project);
    onOpenChange(false);
    toast.success(
      editingProject
        ? "Projeto atualizado com sucesso!"
        : "Projeto criado com sucesso!"
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProject ? "Editar Projeto" : "Novo Projeto"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Shopping Center - CFTV"
              />
            </div>

            <div>
              <Label htmlFor="client">Cliente *</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) =>
                  setFormData({ ...formData, client: e.target.value })
                }
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <Label htmlFor="type">Tipo *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CFTV">CFTV</SelectItem>
                  <SelectItem value="Controle de Acesso">
                    Controle de Acesso
                  </SelectItem>
                  <SelectItem value="Alarme Perimetral">
                    Alarme Perimetral
                  </SelectItem>
                  <SelectItem value="Sistema Integrado">
                    Sistema Integrado
                  </SelectItem>
                  <SelectItem value="Automação">Automação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Endereço do projeto"
              />
            </div>

            <div>
              <Label htmlFor="manager">Gerente de Projeto</Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) =>
                  setFormData({ ...formData, manager: e.target.value })
                }
                placeholder="Nome do gerente"
              />
            </div>

            <div>
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <Label htmlFor="endDate">Data de Término Prevista</Label>
              <Input
                id="endDate"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planejamento</SelectItem>
                  <SelectItem value="execution">Em Execução</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="onhold">Em Espera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="progress">Progresso (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    progress: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary">
              {editingProject ? "Salvar Alterações" : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProjectDialog;
