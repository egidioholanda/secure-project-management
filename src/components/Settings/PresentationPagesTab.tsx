import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePresentationPages } from "@/hooks/usePresentationPages";
import type { PresentationPage } from "@/types/project";
import { Plus, Trash2, ArrowUp, ArrowDown, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const PresentationPagesTab = () => {
  const { pages, loading, addPage, updatePage, movePage, deletePage } = usePresentationPages();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PresentationPage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setTitle("");
    setFile(null);
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Informe um título para a página");
      return;
    }
    if (!file) {
      toast.error("Selecione a imagem da página");
      return;
    }

    setSaving(true);
    const created = await addPage(title.trim(), file);
    setSaving(false);

    if (created) {
      setDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePage(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Páginas de Apresentação</h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Páginas institucionais prontas (capa, soluções por setor, diferenciais, etc.) que podem
            ser incluídas no início do PDF de qualquer proposta. Envie cada página já pronta como
            uma imagem (PNG, JPG ou WebP).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Página
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-10 flex flex-col items-center text-center gap-2">
            <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhuma página de apresentação cadastrada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page, index) => (
            <Card key={page.id} className={!page.active ? "opacity-60" : undefined}>
              <div className="aspect-[210/297] bg-muted overflow-hidden rounded-t-lg border-b">
                <img src={page.image_url} alt={page.title} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-3 space-y-3">
                <p className="font-medium truncate" title={page.title}>{page.title}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`active-${page.id}`}
                      checked={page.active}
                      onCheckedChange={(checked) => updatePage(page.id, { active: checked })}
                    />
                    <Label htmlFor={`active-${page.id}`} className="text-sm cursor-pointer">
                      {page.active ? "Ativa" : "Inativa"}
                    </Label>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === 0}
                      onClick={() => movePage(page.id, "up")}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={index === pages.length - 1}
                      onClick={() => movePage(page.id, "down")}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(page)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v && !saving) setDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Página de Apresentação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Capa, Soluções por Setor, Controle de Acesso..."
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem da página *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="relative aspect-[210/297] max-h-64 mx-auto rounded-lg overflow-hidden bg-muted border">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Pré-visualização"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-2 right-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Trocar imagem
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-[210/297] max-h-64 mx-auto rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted transition-colors"
                >
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para selecionar a imagem</span>
                  <span className="text-xs text-muted-foreground/70 mt-1">JPG, PNG ou WebP (máx. 10MB)</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir página "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta página deixará de estar disponível para inclusão em propostas. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
