import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PresentationPage } from "@/types/project";
import { toast } from "sonner";

export const usePresentationPages = () => {
  const [pages, setPages] = useState<PresentationPage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("presentation_pages")
        .select("*")
        .order("position", { ascending: true });

      if (error) throw error;
      setPages((data as PresentationPage[]) || []);
    } catch (error) {
      console.error("Error fetching presentation pages:", error);
      toast.error("Erro ao carregar páginas de apresentação");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const addPage = async (title: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return null;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `pages/${crypto.randomUUID()}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("presentation-pages")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("presentation-pages")
        .getPublicUrl(filePath);

      const nextPosition = pages.reduce((max, p) => Math.max(max, p.position), -1) + 1;

      const { data, error } = await supabase
        .from("presentation_pages")
        .insert({ title, image_url: urlData.publicUrl, position: nextPosition })
        .select()
        .single();

      if (error) throw error;

      setPages((prev) => [...prev, data as PresentationPage]);
      toast.success("Página adicionada!");
      return data as PresentationPage;
    } catch (error) {
      console.error("Error adding presentation page:", error);
      toast.error("Erro ao adicionar página");
      return null;
    }
  };

  const updatePage = async (id: string, updates: Partial<Pick<PresentationPage, "title" | "active" | "position">>) => {
    try {
      const { data, error } = await supabase
        .from("presentation_pages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setPages((prev) => prev.map((p) => (p.id === id ? (data as PresentationPage) : p)));
    } catch (error) {
      console.error("Error updating presentation page:", error);
      toast.error("Erro ao atualizar página");
    }
  };

  const movePage = async (id: string, direction: "up" | "down") => {
    const sorted = [...pages].sort((a, b) => a.position - b.position);
    const index = sorted.findIndex((p) => p.id === id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return;

    const current = sorted[index];
    const swapWith = sorted[swapIndex];

    try {
      await Promise.all([
        supabase.from("presentation_pages").update({ position: swapWith.position }).eq("id", current.id),
        supabase.from("presentation_pages").update({ position: current.position }).eq("id", swapWith.id),
      ]);
      await fetchPages();
    } catch (error) {
      console.error("Error reordering presentation pages:", error);
      toast.error("Erro ao reordenar páginas");
    }
  };

  const deletePage = async (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (!page) return;

    try {
      const urlParts = page.image_url.split("/presentation-pages/");
      if (urlParts.length > 1) {
        await supabase.storage.from("presentation-pages").remove([urlParts[1]]);
      }

      const { error } = await supabase.from("presentation_pages").delete().eq("id", id);
      if (error) throw error;

      setPages((prev) => prev.filter((p) => p.id !== id));
      toast.success("Página removida");
    } catch (error) {
      console.error("Error deleting presentation page:", error);
      toast.error("Erro ao remover página");
    }
  };

  const activePages = pages
    .filter((p) => p.active)
    .sort((a, b) => a.position - b.position);

  return {
    pages: [...pages].sort((a, b) => a.position - b.position),
    activePages,
    loading,
    addPage,
    updatePage,
    movePage,
    deletePage,
    refetch: fetchPages,
  };
};
