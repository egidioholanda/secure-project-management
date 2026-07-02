import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useClientGroups, GERAL_GROUP_ID, ClientGroup } from '@/hooks/useClientGroups';
import { Plus, Edit, Trash2, Lock, FolderOpen, Users } from 'lucide-react';

interface RoleDefinition {
  id: string;
  name: string;
  is_system: boolean;
}

export const ClientGroupsTab = () => {
  const { toast } = useToast();
  const { groups, createGroup, updateGroup, deleteGroup } = useClientGroups();

  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<Map<string, Set<string>>>(new Map());
  // Map<roleId, Set<groupId>>

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientGroup | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [savingAll, setSavingAll] = useState(false);

  const fetchRolesAndPermissions = async () => {
    const [rolesRes, permsRes] = await Promise.all([
      (supabase as any).from('role_definitions').select('id, name, is_system').order('created_at'),
      (supabase as any).from('role_client_group_permissions').select('role_id, client_group_id'),
    ]);
    setRoles(rolesRes.data || []);
    const map = new Map<string, Set<string>>();
    for (const p of (permsRes.data || [])) {
      if (!map.has(p.role_id)) map.set(p.role_id, new Set());
      map.get(p.role_id)!.add(p.client_group_id);
    }
    setPermissions(map);
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const openCreate = () => {
    setEditingGroup(null);
    setFormName('');
    setFormDesc('');
    setDialogOpen(true);
  };

  const openEdit = (group: ClientGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDesc(group.description || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Informe um nome para o grupo', variant: 'destructive' });
      return;
    }

    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          name: formName.trim(),
          description: formDesc.trim() || null,
        });
      } else {
        await createGroup.mutateAsync({
          name: formName.trim(),
          description: formDesc.trim() || null,
        });
      }
      setDialogOpen(false);
    } catch {
      // Errors handled inside the mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroup.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Errors handled inside the mutation
    }
  };

  const toggleGroupForRole = (roleId: string, groupId: string) => {
    setPermissions((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(roleId) || []);
      if (current.has(groupId)) {
        current.delete(groupId);
      } else {
        current.add(groupId);
      }
      next.set(roleId, current);
      return next;
    });
  };

  const saveAllPermissions = async () => {
    setSavingAll(true);
    try {
      await Promise.all(
        roles.map(async (role) => {
          const groupIds = Array.from(permissions.get(role.id) || []);
          await (supabase as any).from('role_client_group_permissions').delete().eq('role_id', role.id);
          if (groupIds.length > 0) {
            await (supabase as any).from('role_client_group_permissions').insert(
              groupIds.map((gid) => ({ role_id: role.id, client_group_id: gid }))
            );
          }
        })
      );
      await fetchRolesAndPermissions();
      toast({ title: 'Permissões salvas!' });
    } catch {
      toast({ title: 'Erro ao salvar permissões', variant: 'destructive' });
    } finally {
      setSavingAll(false);
    }
  };

  const isSaving = createGroup.isPending || updateGroup.isPending;

  return (
    <div className="space-y-6">
      {/* Section 1: CRUD de grupos */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Grupos de Clientes</h3>
            <p className="text-sm text-muted-foreground">
              Organize seus clientes em grupos para controlar o acesso por perfil de usuário.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{group.name}</span>
                  {group.id === GERAL_GROUP_ID && (
                    <Badge variant="secondary" className="text-xs ml-auto shrink-0">Padrão</Badge>
                  )}
                </CardTitle>
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
              </CardHeader>
              <CardFooter className="pt-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(group)}>
                  <Edit className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                {group.id === GERAL_GROUP_ID ? (
                  <Button size="sm" variant="destructive" disabled title="Grupo padrão não pode ser excluído">
                    <Lock className="w-3 h-3 mr-1" />
                    Excluir
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteTarget(group)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Excluir
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 2: Permissões por Perfil */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Permissões por Perfil
          </h3>
          <p className="text-sm text-muted-foreground">
            Defina quais grupos de clientes cada perfil de usuário pode visualizar.
            Perfis sem nenhum grupo selecionado não verão nenhum cliente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const roleGroups = permissions.get(role.id) || new Set<string>();

            return (
              <Card key={role.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {role.is_system && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                    <span className="truncate">{role.name}</span>
                    {role.is_system && (
                      <Badge variant="secondary" className="text-xs ml-auto shrink-0">Sistema</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 space-y-2">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center gap-3">
                      <Checkbox
                        id={`perm-${role.id}-${group.id}`}
                        checked={roleGroups.has(group.id)}
                        onCheckedChange={() => toggleGroupForRole(role.id, group.id)}
                      />
                      <label
                        htmlFor={`perm-${role.id}-${group.id}`}
                        className="text-sm cursor-pointer select-none flex items-center gap-1.5"
                      >
                        {group.name}
                        {group.id === GERAL_GROUP_ID && (
                          <Badge variant="outline" className="text-xs py-0">Padrão</Badge>
                        )}
                      </label>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum grupo criado ainda.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={saveAllPermissions} disabled={savingAll}>
            {savingAll ? 'Salvando...' : 'Salvar Permissões'}
          </Button>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? `Editar: ${editingGroup.name}` : 'Novo Grupo de Clientes'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do grupo *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Clientes VIP"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Descreva brevemente este grupo..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Os clientes deste grupo não serão excluídos, mas ficarão sem grupo atribuído.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
