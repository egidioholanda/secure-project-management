import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users as UsersIcon, Shield, UserCog, Trash2, Edit, Check, X, Clock } from 'lucide-react';
import { AddUserDialog } from '@/components/Users/AddUserDialog';
import { EditUserDialog } from '@/components/Users/EditUserDialog';
import { DeleteUserDialog } from '@/components/Users/DeleteUserDialog';
import { usePendingUsers } from '@/hooks/usePendingUsers';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: Array<{ role: 'admin' | 'manager' | 'user' | 'sup_tecnico' }>;
}

const Users = () => {
  const { isAdmin, isManager, user } = useAuthContext();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { data: pendingUsers = [], approve, reject } = usePendingUsers();
  const canApprove = isAdmin || isManager;

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => ({ role: r.role as 'admin' | 'manager' | 'user' | 'sup_tecnico' })),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: 'admin' | 'manager' | 'user' | 'sup_tecnico') => {
    const variants = {
      admin: 'destructive',
      manager: 'default',
      user: 'secondary',
      sup_tecnico: 'outline',
    } as const;

    const labels = {
      admin: 'Administrador',
      manager: 'Gerente',
      user: 'Usuário',
      sup_tecnico: 'Suporte Técnico',
    };

    return (
      <Badge variant={variants[role]} className="text-xs">
        {labels[role]}
      </Badge>
    );
  };

  if (!canApprove) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas administradores e gerentes podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleConfirmReject = () => {
    if (!rejectingId) return;
    reject.mutate(
      { userId: rejectingId, reason: rejectReason },
      {
        onSuccess: () => {
          setRejectingId(null);
          setRejectReason('');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-primary" />
            Usuários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuários do sistema
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        )}
      </div>

      {pendingUsers.length > 0 && (
        <Card className="border-accent/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-accent" />
              Cadastros pendentes de aprovação
              <Badge variant="secondary">{pendingUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingUsers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 p-3 rounded-md border bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.full_name || 'Sem nome'}</p>
                  <p className="text-sm text-muted-foreground truncate">{p.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastrado em {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => approve.mutate(p.user_id)}
                    disabled={approve.isPending}
                    className="gap-1"
                  >
                    <Check className="w-4 h-4" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRejectingId(p.user_id);
                      setRejectReason('');
                    }}
                    className="gap-1"
                  >
                    <X className="w-4 h-4" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <UserCog className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum usuário encontrado</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Tente uma busca diferente.' : 'Adicione o primeiro usuário.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((u) => (
            <Card key={u.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-medium">
                      {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {u.full_name || 'Sem nome'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingUser(u)}
                        disabled={u.user_id === user?.id}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingUser(u)}
                        disabled={u.user_id === user?.id}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {u.roles.length > 0 ? (
                    u.roles.map((r, i) => (
                      <span key={i}>{getRoleBadge(r.role)}</span>
                    ))
                  ) : (
                    <Badge variant="outline">Sem função</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Criado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddUserDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchUsers}
      />

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onSuccess={fetchUsers}
        />
      )}

      {deletingUser && (
        <DeleteUserDialog
          user={deletingUser}
          open={!!deletingUser}
          onOpenChange={(open) => !open && setDeletingUser(null)}
          onSuccess={fetchUsers}
        />
      )}

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar cadastro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Informe um motivo (opcional) — o usuário verá esta mensagem ao tentar entrar.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo da rejeição..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={reject.isPending}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
