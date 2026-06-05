import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: Array<{ role: 'admin' | 'manager' | 'user' | 'sup_tecnico' }>;
}

interface DeleteUserDialogProps {
  user: UserWithRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const DeleteUserDialog = ({ user, open, onOpenChange, onSuccess }: DeleteUserDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      // Delete profile (will cascade to roles due to FK)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: 'Usuário removido',
        description: `${user.full_name || user.email} foi removido do sistema.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Tem certeza que deseja remover{' '}
            <strong>{user.full_name || user.email}</strong>? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removendo...
              </>
            ) : (
              'Remover'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
