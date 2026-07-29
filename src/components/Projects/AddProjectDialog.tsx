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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useClientGroups } from "@/hooks/useClientGroups";
import { useAuthContext } from "@/contexts/AuthContext";
import { getProjectTypes } from "@/utils/projectTypes";

import type { Project } from "@/types/project";
export type { Project };

export interface ProjectFormData {
  name: string;
  client: string;
  type: string;
  value: string;
  responsible?: string;
  opportunityId?: string;
  clientGroupId?: string | null;
}

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProject: (project: Project) => void;
  editingProject?: Project | null;
  initialData?: ProjectFormData | null;
  existingProjects?: Project[];
}

const SEPARATOR = "|||";

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const composeAddress = (street: string, city: string, state: string): string => {
  if (!street && !city && !state) return "";
  return [street, city, state].join(SEPARATOR);
};

const parseAddress = (raw: string): { street: string; city: string; state: string } => {
  if (!raw) return { street: "", city: "", state: "" };
  const parts = raw.split(SEPARATOR);
  if (parts.length === 3) return { street: parts[0], city: parts[1], state: parts[2] };
  // backward compat: old single-field addresses go into street
  return { street: raw, city: "", state: "" };
};

const AddProjectDialog = ({
  open,
  onOpenChange,
  onAddProject,
  editingProject,
  initialData,
  existingProjects = [],
}: AddProjectDialogProps) => {
  const { groups } = useClientGroups();
  const { allowedClientGroupIds } = useAuthContext();
  const visibleGroups = allowedClientGroupIds === null
    ? groups
    : groups.filter((g) => allowedClientGroupIds.includes(g.id));
  const [formData, setFormData] = useState({
    name: "",
    client: "",
    type: "",
    status: "planning",
    startDate: "",
    endDate: "",
    manager: "",
    value: "",
    street: "",
    city: "",
    state: "",
    opportunityId: "",
    clientGroupId: null as string | null,
  });

  useEffect(() => {
    if (editingProject) {
      const { street, city, state } = parseAddress(editingProject.address || "");
      setFormData({
        name: editingProject.name,
        client: editingProject.client,
        type: editingProject.type || "",
        status: editingProject.status,
        startDate: editingProject.startDate,
        endDate: editingProject.endDate,
        manager: editingProject.manager,
        value: editingProject.value,
        street,
        city,
        state,
        opportunityId: "",
        clientGroupId: editingProject.clientGroupId ?? null,
      });
    } else if (initialData) {
      setFormData({
        name: initialData.name,
        client: initialData.client,
        type: initialData.type || "",
        status: "planning",
        startDate: "",
        endDate: "",
        manager: initialData.responsible || "",
        value: initialData.value,
        street: "",
        city: "",
        state: "",
        opportunityId: initialData.opportunityId || "",
        clientGroupId: initialData.clientGroupId ?? null,
      });
    } else {
      setFormData({
        name: "",
        client: "",
        type: "",
        status: "planning",
        startDate: "",
        endDate: "",
        manager: "",
        value: "",
        street: "",
        city: "",
        state: "",
        opportunityId: "",
        clientGroupId: null,
      });
    }
  }, [editingProject, initialData, open]);

  const set = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.client) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }
    if (!formData.city || !formData.state) {
      toast.error("Cidade e estado são obrigatórios");
      return;
    }

    const nameTrimmed = formData.name.trim().toLowerCase();
    const duplicate = existingProjects.find(
      (p) =>
        p.name.trim().toLowerCase() === nameTrimmed &&
        p.id !== (editingProject?.id ?? "")
    );
    if (duplicate) {
      toast.error("Já existe um projeto com esse nome. Escolha um nome diferente.");
      return;
    }

    const project: Project = {
      id: editingProject?.id || "",
      name: formData.name,
      client: formData.client,
      type: formData.type,
      status: formData.status,
      startDate: formData.startDate,
      endDate: formData.endDate,
      manager: formData.manager,
      value: formData.value,
      address: composeAddress(formData.street, formData.city, formData.state),
      opportunityId: formData.opportunityId || undefined,
      clientGroupId: formData.clientGroupId || null,
    };

    onAddProject(project);
    onOpenChange(false);
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
            {/* Nome */}
            <div className="col-span-2">
              <Label htmlFor="name">Nome do Projeto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex: Shopping Center - CFTV"
              />
            </div>

            {/* Cliente */}
            <div>
              <Label htmlFor="client">Cliente *</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => set("client", e.target.value)}
                placeholder="Nome do cliente"
              />
            </div>

            {/* Grupo de Clientes */}
            <div>
              <Label htmlFor="clientGroup">Grupo de Clientes</Label>
              <Select
                value={formData.clientGroupId ?? "__none__"}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, clientGroupId: v === "__none__" ? null : v }))
                }
              >
                <SelectTrigger id="clientGroup">
                  <SelectValue placeholder="Sem grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem grupo</SelectItem>
                  {visibleGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de solução — somente leitura, definido na Oportunidade de origem */}
            {formData.type && (
              <div className="col-span-2">
                <Label>Tipo de Solução</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Definido na oportunidade de origem. Para alterar, edite a oportunidade.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getProjectTypes(formData.type).map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Endereço */}
            <div className="col-span-2">
              <Label htmlFor="street">Endereço</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => set("street", e.target.value)}
                placeholder="Rua, número, complemento"
              />
            </div>

            {/* Cidade */}
            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Cidade"
              />
            </div>

            {/* Estado */}
            <div>
              <Label htmlFor="state">Estado *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => set("state", value)}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gerente */}
            <div>
              <Label htmlFor="manager">Gerente de Projeto</Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) => set("manager", e.target.value)}
                placeholder="Nome do gerente"
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => set("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Para Iniciar</SelectItem>
                  <SelectItem value="execution">Em Execução</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="onhold">Aguardando Material</SelectItem>
                  <SelectItem value="stopped">Parado</SelectItem>
                  <SelectItem value="started_stopped">Iniciado/Parado</SelectItem>
                  <SelectItem value="obra_civil">Obra Civil</SelectItem>
                </SelectContent>
              </Select>
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
