import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'manager' | 'user' | 'sup_tecnico';

interface RoleDef {
  id: string;
  name: string;
  is_system: boolean;
}

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  role_definition_id: string | null;
  roles: Array<{ role: AppRole }>;
}

interface EditUserDialogProps {
  user: UserWithRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SYSTEM_ROLE_MAP: Record<string, AppRole> = {
  'Administrador': 'admin',
  'Gerente': 'manager',
  'Suporte Técnico': 'sup_tecnico',
};

export const EditUserDialog = ({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || '');
  const [roleDefinitionId, setRoleDefinitionId] = useState<string>(user.role_definition_id || '');
  const [roleDefs, setRoleDefs] = useState<RoleDef[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    const fetchRoleDefs = async () => {
      setLoadingRoles(true);
      const { data } = await (supabase as any)
        .from('role_definitions')
        .select('id, name, is_system')
        .order('created_at', { ascending: true });

      if (data) {
        setRoleDefs(data);
        if (!user.role_definition_id) {
          // Derive from user_roles for users predating role_definitions
          const currentRole = user.roles[0]?.role || 'user';
          const roleNameMap: Record<AppRole, string> = {
            admin: 'Administrador',
            manager: 'Gerente',
            sup_tecnico: 'Suporte Técnico',
            user: 'Usuário',
          };
          const match = data.find((d: RoleDef) => d.name === roleNameMap[currentRole]);
          if (match) setRoleDefinitionId(match.id);
        }
      }
      setLoadingRoles(false);
    };
    fetchRoleDefs();
  }, [user.role_definition_id, user.roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const selectedDef = roleDefs.find((d) => d.id === roleDefinitionId);
      const appRole: AppRole = selectedDef
        ? (SYSTEM_ROLE_MAP[selectedDef.name] ?? 'user')
        : 'user';

      // Update profile name and role_definition_id
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ full_name: fullName, role_definition_id: roleDefinitionId || null })
        .eq('user_id', user.user_id);
      if (profileError) throw profileError;

      // Keep user_roles in sync for isAdmin / isManager checks
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id);
      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.user_id, role: appRole });
      if (insertError) throw insertError;

      toast({
        title: 'Usuário atualizado',
        description: 'As informações foram salvas com sucesso.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Altere as informações do usuário.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">O email não pode ser alterado.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do usuário"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Perfil de acesso</Label>
            <Select
              value={roleDefinitionId}
              onValueChange={setRoleDefinitionId}
              disabled={loadingRoles}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingRoles ? 'Carregando...' : 'Selecione um perfil'} />
              </SelectTrigger>
              <SelectContent>
                {roleDefs.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    {def.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || loadingRoles || !roleDefinitionId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
