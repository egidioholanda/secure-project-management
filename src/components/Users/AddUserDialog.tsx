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
}

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SYSTEM_ROLE_MAP: Record<string, AppRole> = {
  'Administrador': 'admin',
  'Gerente': 'manager',
  'Suporte Técnico': 'sup_tecnico',
};

// Fixed ID for "Usuário" system role — used as default
const DEFAULT_ROLE_DEF_ID = '00000000-0000-0000-0003-000000000000';

export const AddUserDialog = ({ open, onOpenChange, onSuccess }: AddUserDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleDefinitionId, setRoleDefinitionId] = useState<string>(DEFAULT_ROLE_DEF_ID);
  const [roleDefs, setRoleDefs] = useState<RoleDef[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    if (!open) return;
    const fetchRoleDefs = async () => {
      setLoadingRoles(true);
      const { data } = await (supabase as any)
        .from('role_definitions')
        .select('id, name')
        .order('created_at', { ascending: true });
      if (data) setRoleDefs(data);
      setLoadingRoles(false);
    };
    fetchRoleDefs();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const selectedDef = roleDefs.find((d) => d.id === roleDefinitionId);
      const appRole: AppRole = selectedDef
        ? (SYSTEM_ROLE_MAP[selectedDef.name] ?? 'user')
        : 'user';

      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, password, fullName, role: appRole, roleDefinitionId },
      });

      if (error) {
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) throw new Error(body.error);
        } catch (inner) {
          if (inner instanceof Error && inner !== error) throw inner;
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Usuário criado',
        description: `${fullName} foi adicionado com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setRoleDefinitionId(DEFAULT_ROLE_DEF_ID);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Usuário</DialogTitle>
          <DialogDescription>Crie uma nova conta de usuário no sistema.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
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
            <Button type="submit" disabled={isLoading || loadingRoles}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
