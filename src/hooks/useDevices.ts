import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Device, DeviceCategory } from "@/types/project";
import { toast } from "sonner";

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      const [devicesRes, categoriesRes] = await Promise.all([
        supabase.from("devices").select("*").order("name"),
        supabase.from("device_categories").select("*").order("name"),
      ]);

      if (devicesRes.error) throw devicesRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setDevices(devicesRes.data as Device[]);
      setCategories(categoriesRes.data as DeviceCategory[]);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Erro ao carregar dispositivos");
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async (device: Omit<Device, "id">) => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .insert({
          name: device.name,
          category_id: device.category_id,
          model: device.model,
          brand: device.brand,
          description: device.description,
          unit_price: device.unit_price,
          installation_price: device.installation_price,
          icon: device.icon,
        })
        .select()
        .single();

      if (error) throw error;
      setDevices([...devices, data as Device]);
      toast.success("Dispositivo adicionado!");
      return data;
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error("Erro ao adicionar dispositivo");
      return null;
    }
  };

  const updateDevice = async (id: string, updates: Partial<Omit<Device, "id" | "specifications">>) => {
    try {
      const { error } = await supabase
        .from("devices")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      setDevices(devices.map((d) => (d.id === id ? { ...d, ...updates } : d)));
      toast.success("Dispositivo atualizado!");
    } catch (error) {
      console.error("Error updating device:", error);
      toast.error("Erro ao atualizar dispositivo");
    }
  };

  const deleteDevice = async (id: string) => {
    try {
      const { error } = await supabase.from("devices").delete().eq("id", id);

      if (error) throw error;
      setDevices(devices.filter((d) => d.id !== id));
      toast.success("Dispositivo excluído!");
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error("Erro ao excluir dispositivo");
    }
  };

  const addCategory = async (name: string, icon?: string) => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .insert({ name, icon })
        .select()
        .single();

      if (error) throw error;
      setCategories([...categories, data as DeviceCategory]);
      toast.success("Categoria adicionada!");
      return data;
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Erro ao adicionar categoria");
      return null;
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return {
    devices,
    categories,
    loading,
    addDevice,
    updateDevice,
    deleteDevice,
    addCategory,
    refetch: fetchDevices,
  };
};
