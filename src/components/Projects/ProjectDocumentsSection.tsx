import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Upload, Download, Trash2, Plus, Eye } from "lucide-react";
import { useProjectDocuments } from "@/hooks/useProjectDocuments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  projectId: string;
  canEdit?: boolean;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const ProjectDocumentsSection = ({ projectId, canEdit = true }: Props) => {
  const { documents, isLoading, uploadDocument, deleteDocument, downloadDocument } = useProjectDocuments(projectId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Selecione um arquivo PDF");
    if (file.type !== "application/pdf") return toast.error("Apenas PDFs são permitidos");
    if (file.size > 20 * 1024 * 1024) return toast.error("Arquivo muito grande (máx. 20MB)");
    await uploadDocument.mutateAsync({ file, name: name || file.name, description, project_id: projectId });
    setOpen(false);
    setName("");
    setDescription("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Documentos do Projeto ({documents.length})
        </CardTitle>
        {canEdit && (
          <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Anexar PDF
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum documento anexado</p>
            <p className="text-xs mt-1">Anexe ART, PAC, OT e outros documentos do projeto</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 p-3 border rounded-md hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    {doc.description && <p className="text-xs text-muted-foreground truncate">{doc.description}</p>}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} · {formatSize(doc.file_size)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" title="Baixar" onClick={() => downloadDocument(doc)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      title="Remover"
                      onClick={() => {
                        if (confirm(`Remover "${doc.name}"?`)) deleteDocument.mutate(doc);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar Documento (PDF)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Arquivo PDF *</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  if (f && !name) setName(f.name.replace(/\.pdf$/i, ""));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Nome do Documento</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: ART - João Silva" />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Observações sobre o documento (opcional)"
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadDocument.isPending}>
                {uploadDocument.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProjectDocumentsSection;
