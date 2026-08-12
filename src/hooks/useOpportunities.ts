import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import type { SalesStage } from "@/lib/salesStages";

/**
 * Um negócio = uma oportunidade.
 *
 * Produto e serviço são dois pedidos do MESMO negócio, faturados em
 * momentos diferentes — mas quem rastreia o faturamento é o pipeline do
 * Financeiro (project_phases: fase 5 = produto, fase 10 = serviço), não
 * o status daqui. Por isso os valores são dois e o status é um só.
 */
export interface Opportunity {
  id: string;
  title: string;
  client: string;
  clientId?: string | null;
  clientGroupId?: string | null;
  /** derivado de produto + serviço; nunca editável à mão */
  value: number;
  monthlyValue: number;
  productValue: number | null;
  serviceValue: number | null;
  type: string;
  responsible: string;
  createdAt: string;
  createdAtIso: string;
  /** proxy de "quando entrou na etapa atual" — não há histórico de status */
  updatedAtIso: string;
  status: SalesStage;
  description: string;
  expectedCloseDate: string | null;
  lossReason: string | null;
  archivedAt: string | null;
  mergedIntoId: string | null;
}

interface DbOpportunity {
  id: string;
  title: string;
  client: string;
  client_id: string | null;
  client_group_id: string | null;
  value: number | string | null;
  monthly_value: number | string | null;
  product_value: number | string | null;
  service_value: number | string | null;
  type: string | null;
  responsible: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  expected_close_date: string | null;
  loss_reason: string | null;
  archived_at: string | null;
  merged_into_id: string | null;
}

/** numeric do Postgres chega como string no supabase-js */
const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const mapDbToOpportunity = (db: DbOpportunity): Opportunity => ({
  id: db.id,
  title: db.title,
  client: db.client,
  clientId: db.client_id ?? null,
  clientGroupId: db.client_group_id ?? null,
  value: num(db.value) ?? 0,
  monthlyValue: num(db.monthly_value) ?? 0,
  productValue: num(db.product_value),
  serviceValue: num(db.service_value),
  type: db.type || "",
  responsible: db.responsible || "",
  createdAt: formatDistanceToNow(new Date(db.created_at), {
    addSuffix: false,
    locale: ptBR,
  }),
  createdAtIso: db.created_at,
  updatedAtIso: db.updated_at,
  status: db.status as SalesStage,
  // A coluna se chama `notes`; o mapper antigo não a lia, então a descrição
  // era digitada no formulário e silenciosamente descartada em toda escrita.
  description: db.notes || "",
  expectedCloseDate: db.expected_close_date,
  lossReason: db.loss_reason,
  archivedAt: db.archived_at,
  mergedIntoId: db.merged_into_id,
});

const toDbPayload = (opp: Omit<Opportunity, "id" | "createdAt">) => ({
  title: opp.title,
  client: opp.client,
  // total é sempre derivado — três campos que podiam se contradizer viraram um
  value: (opp.productValue ?? 0) + (opp.serviceValue ?? 0),
  monthly_value: opp.monthlyValue || null,
  product_value: opp.productValue,
  service_value: opp.serviceValue,
  type: opp.type || null,
  responsible: opp.responsible || null,
  status: opp.status,
  notes: opp.description || null,
  client_group_id: opp.clientGroupId || null,
  expected_close_date: opp.expectedCloseDate || null,
  loss_reason: opp.status === "perdida" ? opp.lossReason || null : null,
});

export const useOpportunities = (allowedClientGroupIds?: string[] | null) => {
  const [allOpportunities, setAllOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const opportunities = useMemo(() => {
    if (allowedClientGroupIds === null || allowedClientGroupIds === undefined)
      return allOpportunities;
    return allOpportunities.filter(
      (o) => !o.clientGroupId || allowedClientGroupIds.includes(o.clientGroupId),
    );
  }, [allOpportunities, allowedClientGroupIds]);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        // registros absorvidos na consolidação de pares seguem no banco como
        // trilha de auditoria, mas não são mais negócios
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllOpportunities((data || []).map((d: any) => mapDbToOpportunity(d)));
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error("Erro ao carregar oportunidades");
    } finally {
      setLoading(false);
    }
  };

  const addOpportunity = async (
    opp: Omit<Opportunity, "id" | "createdAt">,
  ): Promise<Opportunity | null> => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .insert(toDbPayload(opp) as any)
        .select()
        .single();

      if (error) throw error;
      const newOpp = mapDbToOpportunity(data as any);
      setAllOpportunities((prev) => [newOpp, ...prev]);
      toast.success("Oportunidade criada com sucesso!");
      return newOpp;
    } catch (error) {
      console.error("Error adding opportunity:", error);
      toast.error("Erro ao criar oportunidade");
      return null;
    }
  };

  const updateOpportunity = async (opp: Opportunity, silent = false) => {
    try {
      const { error } = await supabase
        .from("opportunities")
        .update(toDbPayload(opp) as any)
        .eq("id", opp.id);

      if (error) throw error;
      setAllOpportunities((prev) =>
        prev.map((o) =>
          o.id === opp.id
            ? { ...opp, value: (opp.productValue ?? 0) + (opp.serviceValue ?? 0) }
            : o,
        ),
      );
      // arrastar card no Kanban não merece toast a cada movimento
      if (!silent) toast.success("Oportunidade atualizada com sucesso!");
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast.error("Erro ao atualizar oportunidade");
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
      setAllOpportunities((prev) => prev.filter((o) => o.id !== id));
      toast.success("Oportunidade excluída com sucesso!");
    } catch (error) {
      console.error("Error deleting opportunity:", error);
      toast.error("Erro ao excluir oportunidade");
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  return {
    opportunities,
    loading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
    refetch: fetchOpportunities,
  };
};
