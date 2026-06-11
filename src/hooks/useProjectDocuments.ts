import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProjectDocument {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjectDocuments(projectId?: string) {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["project_documents", projectId],
    queryFn: async () => {
      let q = supabase.from("project_documents").select("*").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data as ProjectDocument[];
    },
    enabled: !!projectId,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, name, description, project_id }: { file: File; name: string; description?: string; project_id: string }) => {
      const ext = file.name.split(".").pop();
      const path = `${project_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("project-documents").upload(path, file, {
        contentType: file.type || "application/pdf",
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("project-documents").getPublicUrl(path);
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("project_documents")
        .insert({
          project_id,
          name,
          description: description || null,
          file_url: urlData.publicUrl,
          file_path: path,
          file_type: file.type || "application/pdf",
          file_size: file.size,
          uploaded_by: user.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_documents"] });
      toast.success("Documento enviado!");
    },
    onError: (e: any) => toast.error("Erro ao enviar documento: " + e.message),
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: ProjectDocument) => {
      await supabase.storage.from("project-documents").remove([doc.file_path]);
      const { error } = await supabase.from("project_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_documents"] });
      toast.success("Documento removido");
    },
    onError: () => toast.error("Erro ao remover documento"),
  });

  const downloadDocument = async (doc: ProjectDocument) => {
    const { data, error } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(doc.file_path, 60 * 5);
    if (error || !data) {
      toast.error("Não foi possível gerar link do arquivo");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return { documents, isLoading, uploadDocument, deleteDocument, downloadDocument };
}
