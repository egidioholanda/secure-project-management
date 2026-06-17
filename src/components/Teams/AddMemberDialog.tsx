import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import type { TeamMember, TeamMemberRole } from '@/types/teams';
import { ROLE_LABELS } from '@/types/teams';

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (userId: string, role: TeamMemberRole) => Promise<void>;
  existingMembers: TeamMember[];
}

const AddMemberDialog = ({ open, onClose, onSave, existingMembers }: Props) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<TeamMemberRole>('tecnico');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .order('full_name')
      .then(({ data }) => setProfiles((data as Profile[]) ?? []));
  }, [open]);

  const available = profiles.filter(
    (p) => !existingMembers.some((m) => m.user_id === p.user_id),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    await onSave(userId, role);
    setSaving(false);
    setUserId('');
    setRole('tecnico');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar membro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {available.length === 0 && (
                  <SelectItem value="__none" disabled>Nenhum usuário disponível</SelectItem>
                )}
                {available.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.full_name ?? p.email ?? p.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Papel na equipe</Label>
            <Select value={role} onValueChange={(v) => setRole(v as TeamMemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ROLE_LABELS) as [TeamMemberRole, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving || !userId}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;
