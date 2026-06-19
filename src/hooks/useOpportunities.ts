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
  monthlyValue: string;
  productValue: string;
  serviceValue: string;
  type: string;
  responsible: string;
  createdAt: string;
  status:
    | "prospeccao"
    | "qualificacao"
    | "proposta"
    | "pedido_cliente"
    | "negociacao"
    | "pedido_produto"
    | "pedido_servico"
    | "ganha"
    | "faturado_produto"
    | "faturado_servico";
  createdAtIso: string;
  description?: string;
}

interface DbOpportunity {
  id: string;
  title: string;
  client: string;
  value: string | null;
  monthly_value: string | null;
  product_value: string | null;
  service_value: string | null;
  type: string | null;
  responsible: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const parseBRL = (raw: string) => {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const computeTotal = (productValue: string, serviceValue: string, fallback: string): string => {
  const prod = parseBRL(productValue);
  const serv = parseBRL(serviceValue);
  if (prod > 0 || serv > 0) {
    const total = prod + serv;
    return `R$ ${total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  }
  return fallback;
};

const mapDbToOpportunity = (db: DbOpportunity): Opportunity => ({
  id: db.id,
  title: db.title,
  client: db.client,
  value: db.value || "",
  monthlyValue: db.monthly_value || "",
  productValue: db.product_value || "",
  serviceValue: db.service_value || "",
  type: db.type || "",
  responsible: db.responsible || "",
  createdAt: formatDistanceToNow(new Date(db.created_at), {
    addSuffix: false,
    locale: ptBR,
  }),
  createdAtIso: db.created_at,
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
      setOpportunities((data || []).map((d: any) => mapDbToOpportunity(d)));
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
      const totalValue = computeTotal(opp.productValue, opp.serviceValue, opp.value);
      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          title: opp.title,
          client: opp.client,
          value: totalValue || null,
          monthly_value: opp.monthlyValue || null,
          product_value: opp.productValue || null,
          service_value: opp.serviceValue || null,
          type: opp.type || null,
          responsible: opp.responsible || null,
          status: opp.status,
        } as any)
        .select()
        .single();

      if (error) throw error;
      const newOpp = mapDbToOpportunity(data as any);
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
      const totalValue = computeTotal(opp.productValue, opp.serviceValue, opp.value);
      const { error } = await supabase
        .from("opportunities")
        .update({
          title: opp.title,
          client: opp.client,
          value: totalValue || null,
          monthly_value: opp.monthlyValue || null,
          product_value: opp.productValue || null,
          service_value: opp.serviceValue || null,
          type: opp.type || null,
          responsible: opp.responsible || null,
          status: opp.status,
        } as any)
        .eq("id", opp.id);

      if (error) throw error;
      setOpportunities((prev) =>
        prev.map((o) => (o.id === opp.id ? { ...opp, value: totalValue } : o))
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
