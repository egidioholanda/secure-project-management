import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Resource, ResourceType, ResourceStatus } from '@/types/teams';
import { RESOURCE_TYPE_LABELS, RESOURCE_STATUS_LABELS } from '@/types/teams';
import type { Team } from '@/types/teams';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    type: string;
    description?: string;
    status: ResourceStatus;
    team_id?: string | null;
  }) => Promise<void>;
  teams: Team[];
  initial?: Resource;
}

const AddResourceDialog = ({ open, onClose, onSave, teams, initial }: Props) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<ResourceType>(initial?.type ?? 'equipamento');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<ResourceStatus>(initial?.status ?? 'disponivel');
  const [teamId, setTeamId] = useState<string>(initial?.team_id ?? '__none');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name,
      type,
      description: description.trim() || undefined,
      status,
      team_id: teamId === '__none' ? null : teamId,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar recurso' : 'Novo recurso'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Escada 8m, Furgão ABC-1234"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as ResourceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(RESOURCE_TYPE_LABELS) as [ResourceType, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ResourceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(RESOURCE_STATUS_LABELS) as [ResourceStatus, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Equipe responsável</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger><SelectValue placeholder="Sem equipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem equipe</SelectItem>
                {teams.filter((t) => t.active).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Placa, número de série, condições..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddResourceDialog;
