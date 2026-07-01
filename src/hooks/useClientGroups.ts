import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClientGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export const GERAL_GROUP_ID = "00000000-0000-0000-0000-000000000001";

export function useClientGroups() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["client_groups"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ClientGroup[];
    },
  });

  const createGroup = useMutation({
    mutationFn: async (group: { name: string; description?: string | null }) => {
      const { data, error } = await (supabase as any)
        .from("client_groups")
        .insert(group)
        .select()
        .single();
      if (error) throw error;
      return data as ClientGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_groups"] });
      toast({ title: "Grupo criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar grupo", variant: "destructive" }),
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string | null }) => {
      const { data, error } = await (supabase as any)
        .from("client_groups")
        .update({ name, description, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as ClientGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_groups"] });
      toast({ title: "Grupo atualizado!" });
    },
    onError: () => toast({ title: "Erro ao atualizar grupo", variant: "destructive" }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("client_groups")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_groups"] });
      toast({ title: "Grupo removido!" });
    },
    onError: () => toast({ title: "Erro ao remover grupo", variant: "destructive" }),
  });

  return { groups, isLoading, createGroup, updateGroup, deleteGroup };
}
