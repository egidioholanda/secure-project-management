import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Service } from "@/types/project";

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("name");
    if (error) {
      toast.error("Erro ao carregar serviços");
      setLoading(false);
      return;
    }
    setServices(data as Service[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const addService = async (service: Omit<Service, "id">) => {
    const { data, error } = await supabase
      .from("services")
      .insert(service)
      .select()
      .single();
    if (error) { toast.error("Erro ao adicionar serviço"); return; }
    setServices((prev) => [...prev, data as Service].sort((a, b) => a.name.localeCompare(b.name)));
    toast.success("Serviço adicionado!");
  };

  const updateService = async (service: Service) => {
    const { error } = await supabase
      .from("services")
      .update({ name: service.name, description: service.description, unit_price: service.unit_price })
      .eq("id", service.id);
    if (error) { toast.error("Erro ao atualizar serviço"); return; }
    setServices((prev) => prev.map((s) => (s.id === service.id ? service : s)));
    toast.success("Serviço atualizado!");
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir serviço"); return; }
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast.success("Serviço excluído!");
  };

  return { services, loading, addService, updateService, deleteService };
};
