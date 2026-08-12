import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProjectPhaseRecord {
  id: string;
  project_id: string;
  phase: number;
  completed_at: string;
  completed_by: string | null;
  completed_by_name: string | null;
  note: string | null;
}

export function useProjectPhases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: phases = [], isLoading } = useQuery({
    queryKey: ["project_phases"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_phases")
        .select("*")
        .order("phase");
      if (error) throw error;
      return data as ProjectPhaseRecord[];
    },
  });

  // Concluir uma fase também conclui as anteriores que ficaram em branco —
  // um checklist sequencial não pode ter buracos no meio da trilha.
  const completePhase = useMutation({
    mutationFn: async ({
      projectId,
      phase,
      note,
      userId,
      userName,
      alreadyDone,
    }: {
      projectId: string;
      phase: number;
      note?: string | null;
      userId: string | null;
      userName: string | null;
      alreadyDone: number[];
    }) => {
      const missing = [];
      for (let p = 1; p <= phase; p++) {
        if (!alreadyDone.includes(p)) missing.push(p);
      }
      if (missing.length === 0) return;

      const rows = missing.map((p) => ({
        project_id: projectId,
        phase: p,
        completed_by: userId,
        completed_by_name: userName,
        // A observação pertence só à fase que o usuário marcou de fato
        note: p === phase ? note?.trim() || null : null,
      }));

      const { error } = await (supabase as any).from("project_phases").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_phases"] });
    },
    onError: (err: any) =>
      toast({
        title: "Erro ao registrar fase",
        description: err?.message,
        variant: "destructive",
      }),
  });

  // Reabrir uma fase remove ela e todas as posteriores, pelo mesmo motivo.
  const reopenPhase = useMutation({
    mutationFn: async ({ projectId, phase }: { projectId: string; phase: number }) => {
      const { error } = await (supabase as any)
        .from("project_phases")
        .delete()
        .eq("project_id", projectId)
        .gte("phase", phase);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_phases"] });
    },
    onError: (err: any) =>
      toast({
        title: "Erro ao reabrir fase",
        description: err?.message,
        variant: "destructive",
      }),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await (supabase as any)
        .from("project_phases")
        .update({ note: note.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_phases"] });
      toast({ title: "Observação salva" });
    },
    onError: (err: any) =>
      toast({
        title: "Erro ao salvar observação",
        description: err?.message,
        variant: "destructive",
      }),
  });

  return { phases, isLoading, completePhase, reopenPhase, updateNote };
}
