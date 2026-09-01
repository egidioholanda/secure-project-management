import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Um pedido faturável: (projeto, modalidade, produto|serviço).
 *
 * Um projeto com CFTV e Controle de Acesso tem pedidos separados por
 * modalidade, faturados em momentos diferentes. Antes isto era implícito em
 * product_value/service_value do projeto, o que só comportava um de cada.
 */
export interface ProjectOrder {
  id: string;
  project_id: string;
  /** slug estável; o label vive em billing_categories */
  category: string;
  kind: "produto" | "servico";
  value: number;
}

export interface BillingCategory {
  slug: string;
  label: string;
  active: boolean;
  sort_order: number;
}

/** pedido herdado que ainda não foi repartido por modalidade */
export const UNSPLIT_CATEGORY = "nao_separado";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export function useProjectOrders() {
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["project_orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_orders")
        .select("id, project_id, category, kind, value");
      if (error) throw error;
      return (data ?? []).map((o: any) => ({
        ...o,
        value: num(o.value),
      })) as ProjectOrder[];
    },
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["billing_categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("billing_categories")
        .select("slug, label, active, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as BillingCategory[];
    },
  });

  return { orders, categories, isLoading: ordersLoading || catsLoading };
}
