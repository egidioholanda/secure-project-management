import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MaintenanceSchedule {
  id: string;
  client_id: string;
  contract_id: string | null;
  title: string;
  type: string;
  periodicity: string;
  next_date: string;
  technician: string | null;
  description: string | null;
  is_active: boolean;
  notify_7_days: boolean;
  notify_3_days: boolean;
  notify_email: string | null;
  created_at: string;
  updated_at: string;
  client?: { name: string } | null;
}

export function useMaintenanceSchedules(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["maintenance_schedules", clientId],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_schedules" as any)
        .select("*")
        .order("next_date", { ascending: true });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MaintenanceSchedule[];
    },
    enabled: clientId ? true : true,
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: Omit<MaintenanceSchedule, "id" | "created_at" | "updated_at" | "client">) => {
      const { data, error } = await supabase
        .from("maintenance_schedules" as any)
        .insert(schedule as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_schedules"] });
      toast({ title: "Agendamento recorrente criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar agendamento", variant: "destructive" }),
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...schedule }: Partial<MaintenanceSchedule> & { id: string }) => {
      const { client, ...data } = schedule as any;
      const { data: result, error } = await supabase
        .from("maintenance_schedules" as any)
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_schedules"] });
      toast({ title: "Agendamento atualizado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao atualizar agendamento", variant: "destructive" }),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_schedules" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_schedules"] });
      toast({ title: "Agendamento removido com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao remover agendamento", variant: "destructive" }),
  });

  return { schedules, isLoading, createSchedule, updateSchedule, deleteSchedule };
}

// Fetch all active schedules for notifications (no client filter)
export function useAllMaintenanceSchedules() {
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["maintenance_schedules_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_schedules" as any)
        .select("*, client:clients(name)")
        .eq("is_active", true)
        .order("next_date", { ascending: true });
      if (error) throw error;
      return data as unknown as (MaintenanceSchedule & { client: { name: string } })[];
    },
  });

  return { schedules, isLoading };
}
