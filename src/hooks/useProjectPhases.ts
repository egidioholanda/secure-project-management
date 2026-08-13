import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PhaseTrack = "produto" | "servico";

export interface ProjectPhaseRecord {
  id: string;
  project_id: string;
  /** produto e serviço são dois pedidos com relógios independentes */
  track: PhaseTrack;
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
        .order("track")
        .order("phase");
      if (error) throw error;
      return data as ProjectPhaseRecord[];
    },
  });

  // Quais fases entram fica com o modelo (phasesToComplete): a regra depende
  // de cada trilha — na de serviço a obra pode ter começado antes do pedido.
  const completePhase = useMutation({
    mutationFn: async ({
      projectId,
      track,
      phase,
      phases: toInsert,
      note,
      userId,
      userName,
    }: {
      projectId: string;
      track: PhaseTrack;
      /** a fase que o usuário marcou — é dela que a observação é */
      phase: number;
      /** todas as fases a gravar, já resolvidas pelo modelo */
      phases: number[];
      note?: string | null;
      userId: string | null;
      userName: string | null;
    }) => {
      if (toInsert.length === 0) return;

      const rows = toInsert.map((p) => ({
        project_id: projectId,
        track,
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
    mutationFn: async ({
      projectId, track, phases: toRemove,
    }: { projectId: string; track: PhaseTrack; phases: number[] }) => {
      if (toRemove.length === 0) return;
      const { error } = await (supabase as any)
        .from("project_phases")
        .delete()
        .eq("project_id", projectId)
        .eq("track", track)
        .in("phase", toRemove);
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
