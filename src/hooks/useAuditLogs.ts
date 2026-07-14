import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export type AuditPeriod = 'today' | '7d' | '30d' | 'all';

export interface AuditFilters {
  period: AuditPeriod;
  action: string;
  resourceType: string;
  userSearch: string;
}

export function useAuditLogs(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (filters.period !== 'all') {
        const days = filters.period === 'today' ? 1 : filters.period === '7d' ? 7 : 30;
        const from = new Date();
        from.setDate(from.getDate() - days);
        query = query.gte('created_at', from.toISOString());
      }

      if (filters.action)       query = query.eq('action', filters.action);
      if (filters.resourceType) query = query.eq('resource_type', filters.resourceType);

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as AuditLog[];

      if (filters.userSearch) {
        const s = filters.userSearch.toLowerCase();
        results = results.filter(
          (l) =>
            l.user_name?.toLowerCase().includes(s) ||
            l.user_email?.toLowerCase().includes(s),
        );
      }

      return results;
    },
  });
}
