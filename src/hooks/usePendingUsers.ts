import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PendingUser {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

export const usePendingUsers = () => {
  const { isAdmin, isManager, user } = useAuthContext();
  const canApprove = isAdmin || isManager;
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['pending-users'],
    enabled: canApprove,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, created_at, approval_status')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PendingUser[];
    },
    refetchInterval: 60000,
  });

  const approve = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          rejection_reason: null,
        })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-users'] });
      toast({ title: 'Usuário aprovado', description: 'O acesso foi liberado.' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const reject = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          rejection_reason: reason || null,
        })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-users'] });
      toast({ title: 'Cadastro rejeitado' });
    },
    onError: (e: any) =>
      toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { ...query, canApprove, approve, reject };
};
