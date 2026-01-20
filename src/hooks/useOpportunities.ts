import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Opportunity {
  id: string;
  title: string;
  client: string;
  value: string;
  type: string;
  responsible: string;
  createdAt: string;
  status: "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "ganha";
}

interface DbOpportunity {
  id: string;
  title: string;
  client: string;
  value: string | null;
  type: string | null;
  responsible: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const mapDbToOpportunity = (db: DbOpportunity): Opportunity => ({
  id: db.id,
  title: db.title,
  client: db.client,
  value: db.value || "",
  type: db.type || "",
  responsible: db.responsible || "",
  createdAt: formatDistanceToNow(new Date(db.created_at), {
    addSuffix: false,
    locale: ptBR,
  }),
  status: db.status as Opportunity["status"],
});

export const useOpportunities = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpportunities((data || []).map(mapDbToOpportunity));
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error("Erro ao carregar oportunidades");
    } finally {
      setLoading(false);
    }
  };

  const addOpportunity = async (
    opp: Omit<Opportunity, "id" | "createdAt">
  ): Promise<Opportunity | null> => {
    try {
      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          title: opp.title,
          client: opp.client,
          value: opp.value || null,
          type: opp.type || null,
          responsible: opp.responsible || null,
          status: opp.status,
        })
        .select()
        .single();

      if (error) throw error;
      const newOpp = mapDbToOpportunity(data);
      setOpportunities((prev) => [newOpp, ...prev]);
      toast.success("Oportunidade criada com sucesso!");
      return newOpp;
    } catch (error) {
      console.error("Error adding opportunity:", error);
      toast.error("Erro ao criar oportunidade");
      return null;
    }
  };

  const updateOpportunity = async (opp: Opportunity) => {
    try {
      const { error } = await supabase
        .from("opportunities")
        .update({
          title: opp.title,
          client: opp.client,
          value: opp.value || null,
          type: opp.type || null,
          responsible: opp.responsible || null,
          status: opp.status,
        })
        .eq("id", opp.id);

      if (error) throw error;
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opp.id ? opp : o))
      );
      toast.success("Oportunidade atualizada com sucesso!");
    } catch (error) {
      console.error("Error updating opportunity:", error);
      toast.error("Erro ao atualizar oportunidade");
    }
  };

  const deleteOpportunity = async (id: string) => {
    try {
      const { error } = await supabase
        .from("opportunities")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
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
