import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Edit, Trash2, Lock } from 'lucide-react';

const ALL_PAGES = [
  { slug: '/dashboard/operacional', label: 'Dashboard Operacional' },
  { slug: '/dashboard/comercial', label: 'Dashboard Comercial' },
  { slug: '/oportunidades', label: 'Oportunidades' },
  { slug: '/projetos', label: 'Projetos' },
  { slug: '/mapa', label: 'Mapa' },
  { slug: '/catalogo', label: 'Catálogo' },
  { slug: '/cronogramas', label: 'Cronogramas' },
  { slug: '/relatorios', label: 'Relatórios' },
  { slug: '/clientes', label: 'Clientes' },
  { slug: '/equipes', label: 'Equipes' },
  { slug: '/usuarios', label: 'Usuários' },
  { slug: '/financeiro', label: 'Financeiro' },
  { slug: '/auditoria', label: 'Auditoria' },
  { slug: '/configuracoes', label: 'Configurações' },
];

interface RoleDefinition {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  pages: string[];
}

export const RoleProfilesTab = () => {
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDefinition | null>(null);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPages, setFormPages] = useState<Set<string>>(new Set());

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [defsRes, permsRes] = await Promise.all([
        (supabase as any).from('role_definitions').select('*').order('created_at', { ascending: true }),
        (supabase as any).from('role_page_permissions').select('role_id, page_slug'),
      ]);

      if (defsRes.error) throw defsRes.error;

      const pagesByRole = new Map<string, string[]>();
      for (const p of (permsRes.data || [])) {
        if (!pagesByRole.has(p.role_id)) pagesByRole.set(p.role_id, []);
        pagesByRole.get(p.role_id)!.push(p.page_slug);
      }

      setRoles(
        (defsRes.data || []).map((d: any) => ({
          ...d,
          pages: pagesByRole.get(d.id) || [],
        }))
      );
    } catch (err: any) {
      toast({ title: 'Erro ao carregar perfis', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditingRole(null);
    setFormName('');
    setFormDesc('');
    setFormPages(new Set());
    setDialogOpen(true);
  };

  const openEdit = (role: RoleDefinition) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDesc(role.description || '');
    setFormPages(new Set(role.pages));
    setDialogOpen(true);
  };

  const togglePage = (slug: string) => {
    setFormPages((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ title: 'Informe um nome para o perfil', variant: 'destructive' });
      return;
    }
    if (formPages.size === 0) {
      toast({ title: 'Selecione pelo menos uma página', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let roleId: string;

      if (editingRole) {
        if (!editingRole.is_system) {
          const { error } = await (supabase as any)
            .from('role_definitions')
            .update({ name: formName.trim(), description: formDesc.trim() || null })
            .eq('id', editingRole.id);
          if (error) throw error;
        }
        roleId = editingRole.id;
      } else {
        const { data, error } = await (supabase as any)
          .from('role_definitions')
          .insert({ name: formName.trim(), description: formDesc.trim() || null })
          .select('id')
          .single();
        if (error) throw error;
        roleId = data.id;
      }

      // Replace page permissions atomically
      await (supabase as any).from('role_page_permissions').delete().eq('role_id', roleId);
      const { error: permsError } = await (supabase as any)
        .from('role_page_permissions')
        .insert(Array.from(formPages).map((slug) => ({ role_id: roleId, page_slug: slug })));
      if (permsError) throw permsError;

      toast({ title: editingRole ? 'Perfil atualizado' : 'Perfil criado com sucesso' });
      setDialogOpen(false);
      fetchRoles();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await (supabase as any)
        .from('role_definitions')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Perfil excluído' });
      setDeleteTarget(null);
      fetchRoles();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando perfis...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Perfis de Acesso</h3>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie perfis de usuário definindo quais páginas cada perfil pode acessar.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {role.is_system && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                <span className="truncate">{role.name}</span>
                {role.is_system && (
                  <Badge variant="secondary" className="text-xs ml-auto shrink-0">Sistema</Badge>
                )}
              </CardTitle>
              {role.description && (
                <p className="text-sm text-muted-foreground">{role.description}</p>
              )}
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-xs text-muted-foreground mb-2">
                {role.pages.length} {role.pages.length === 1 ? 'página' : 'páginas'} com acesso
              </p>
              <div className="flex flex-wrap gap-1">
                {role.pages
                  .slice(0, 4)
                  .map((slug) => {
                    const page = ALL_PAGES.find((p) => p.slug === slug);
                    return (
                      <Badge key={slug} variant="outline" className="text-xs">
                        {page?.label || slug}
                      </Badge>
                    );
                  })}
                {role.pages.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{role.pages.length - 4}
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(role)}>
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
              {!role.is_system && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteTarget(role)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Excluir
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) setDialogOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? `Editar: ${editingRole.name}` : 'Novo Perfil de Acesso'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do perfil</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Vendedor"
                disabled={editingRole?.is_system}
              />
              {editingRole?.is_system && (
                <p className="text-xs text-muted-foreground">
                  O nome de perfis do sistema não pode ser alterado.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Descreva brevemente este perfil..."
                rows={2}
                disabled={editingRole?.is_system}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Páginas com acesso</Label>
                <span className="text-xs text-muted-foreground">
                  {formPages.size} / {ALL_PAGES.length} selecionadas
                </span>
              </div>
              <div className="border rounded-lg p-3 space-y-2 max-h-56 overflow-y-auto">
                {ALL_PAGES.map((page) => (
                  <div key={page.slug} className="flex items-center gap-3">
                    <Checkbox
                      id={`page-${page.slug}`}
                      checked={formPages.has(page.slug)}
                      onCheckedChange={() => togglePage(page.slug)}
                    />
                    <label
                      htmlFor={`page-${page.slug}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {page.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Usuários com este perfil ficarão sem perfil de acesso atribuído. Esta ação não pode ser desfeita.
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
