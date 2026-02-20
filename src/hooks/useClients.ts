import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  project_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project?: { name: string } | null;
}

export interface MaintenanceContract {
  id: string;
  client_id: string;
  title: string;
  type: string;
  periodicity: string | null;
  start_date: string | null;
  end_date: string | null;
  value: number;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceOrder {
  id: string;
  client_id: string;
  contract_id: string | null;
  title: string;
  type: string;
  status: string;
  technician: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  description: string | null;
  observations: string | null;
  equipment_attended: string[] | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
  photos?: { id: string; url: string; caption: string | null }[];
}

export function useClients() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, project:projects(name)")
        .order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  const createClient = useMutation({
    mutationFn: async (client: Omit<Client, "id" | "created_at" | "updated_at" | "project">) => {
      const { data, error } = await supabase.from("clients").insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar cliente", variant: "destructive" }),
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, ...client }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase.from("clients").update(client).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente atualizado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao atualizar cliente", variant: "destructive" }),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente removido com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao remover cliente", variant: "destructive" }),
  });

  return { clients, isLoading, createClient, updateClient, deleteClient };
}

export function useMaintenanceContracts(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["maintenance_contracts", clientId],
    queryFn: async () => {
      let query = supabase.from("maintenance_contracts").select("*").order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MaintenanceContract[];
    },
    enabled: !!clientId,
  });

  const createContract = useMutation({
    mutationFn: async (contract: Omit<MaintenanceContract, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("maintenance_contracts").insert(contract).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_contracts"] });
      toast({ title: "Contrato criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar contrato", variant: "destructive" }),
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...contract }: Partial<MaintenanceContract> & { id: string }) => {
      const { data, error } = await supabase.from("maintenance_contracts").update(contract).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_contracts"] });
      toast({ title: "Contrato atualizado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao atualizar contrato", variant: "destructive" }),
  });

  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_contracts"] });
      toast({ title: "Contrato removido com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao remover contrato", variant: "destructive" }),
  });

  return { contracts, isLoading, createContract, updateContract, deleteContract };
}

export function useMaintenanceOrders(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["maintenance_orders", clientId],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_orders")
        .select("*, photos:maintenance_photos(*)")
        .order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MaintenanceOrder[];
    },
    enabled: !!clientId,
  });

  const createOrder = useMutation({
    mutationFn: async (order: Omit<MaintenanceOrder, "id" | "created_at" | "updated_at" | "photos">) => {
      const { data, error } = await supabase.from("maintenance_orders").insert(order).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_orders"] });
      toast({ title: "Ordem de serviço criada com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar ordem de serviço", variant: "destructive" }),
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...order }: Partial<MaintenanceOrder> & { id: string }) => {
      const { photos, ...orderData } = order as any;
      const { data, error } = await supabase.from("maintenance_orders").update(orderData).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_orders"] });
      toast({ title: "Ordem de serviço atualizada com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao atualizar ordem de serviço", variant: "destructive" }),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance_orders"] });
      toast({ title: "Ordem de serviço removida com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao remover ordem de serviço", variant: "destructive" }),
  });

  const uploadPhoto = async (orderId: string, file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `orders/${orderId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("maintenance-files").upload(path, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("maintenance-files").getPublicUrl(path);
    const { error: dbError } = await supabase.from("maintenance_photos").insert({ order_id: orderId, url: data.publicUrl });
    if (dbError) throw dbError;
    queryClient.invalidateQueries({ queryKey: ["maintenance_orders"] });
    return data.publicUrl;
  };

  const uploadSignature = async (orderId: string, dataUrl: string): Promise<string> => {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `signatures/${orderId}/signature.png`;
    const { error: uploadError } = await supabase.storage.from("maintenance-files").upload(path, blob, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("maintenance-files").getPublicUrl(path);
    await supabase.from("maintenance_orders").update({ signature_url: data.publicUrl }).eq("id", orderId);
    queryClient.invalidateQueries({ queryKey: ["maintenance_orders"] });
    return data.publicUrl;
  };

  return { orders, isLoading, createOrder, updateOrder, deleteOrder, uploadPhoto, uploadSignature };
}
