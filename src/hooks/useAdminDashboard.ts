import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminContract {
  id: string;
  client_id: string;
  title: string;
  type: string;
  periodicity: string | null;
  start_date: string | null;
  end_date: string | null;
  value: number;
  status: string;
  created_at: string;
  updated_at: string;
  clients: { id: string; name: string } | null;
}

export interface AdminOrder {
  id: string;
  type: string;
  status: string;
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
}

export function useAdminContracts() {
  return useQuery({
    queryKey: ['admin-dashboard-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_contracts')
        .select('*, clients(id, name)');
      if (error) throw error;
      return (data ?? []) as AdminContract[];
    },
  });
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ['admin-dashboard-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_orders')
        .select('id, type, status, scheduled_date, completed_date, created_at');
      if (error) throw error;
      return (data ?? []) as AdminOrder[];
    },
  });
}
