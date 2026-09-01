import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PhaseTrack = "produto" | "servico";

export interface ProjectPhaseRecord {
  id: string;
  /** a fase pertence ao PEDIDO; project_id/track ficam por um release como
   *  rede de segurança da migração, mas não são mais lidos */
  order_id: string | null;
  project_id: string;
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
      orderId,
      projectId,
      track,
      phase,
      phases: toInsert,
      completedAt,
      note,
      userId,
      userName,
    }: {
      orderId: string;
      projectId: string;
      track: PhaseTrack;
      /** a fase que o usuário marcou — é dela que a observação é */
      phase: number;
      /** todas as fases a gravar, já resolvidas pelo modelo */
      phases: number[];
      /**
       * Data real do evento (yyyy-MM-dd). Projetos lançados no sistema meses
       * depois do faturamento precisam disso, senão o mês do faturamento fica
       * sendo o mês do cadastro.
       */
      completedAt?: string | null;
      note?: string | null;
      userId: string | null;
      userName: string | null;
    }) => {
      if (toInsert.length === 0) return;

      const rows = toInsert.map((p) => ({
        order_id: orderId,
        project_id: projectId,
        track,
        phase: p,
        // as fases arrastadas junto herdam a mesma data, senão o lead time
        // sairia negativo ao lançar retroativo
        ...(completedAt ? { completed_at: completedAt } : {}),
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
      orderId, phases: toRemove,
    }: { orderId: string; phases: number[] }) => {
      if (toRemove.length === 0) return;
      const { error } = await (supabase as any)
        .from("project_phases")
        .delete()
        .eq("order_id", orderId)
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

  /**
   * Corrige datas de fases já registradas. Recebe a lista pronta porque a
   * regra de coerência (fases anteriores não podem ficar depois) mora no
   * modelo, em datesToAlign.
   */
  const updatePhaseDate = useMutation({
    mutationFn: async ({
      updates,
    }: {
      updates: { id: string; completedAt: string }[];
    }) => {
      if (updates.length === 0) return;
      for (const u of updates) {
        const { error } = await (supabase as any)
          .from("project_phases")
          .update({ completed_at: u.completedAt })
          .eq("id", u.id);
        if (error) throw error;
      }
      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["project_phases"] });
      toast({
        title:
          typeof count === "number" && count > 1
            ? `Data atualizada — ${count} fases ajustadas para manter a ordem`
            : "Data atualizada",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Erro ao atualizar a data",
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

  return { phases, isLoading, completePhase, reopenPhase, updatePhaseDate, updateNote };
}
