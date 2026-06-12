import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProposalItem } from "@/types/project";

export interface ProposalTemplate {
  id: string;
  name: string;
  title: string | null;
  introduction: string | null;
  scope: string | null;
  validity_days: number;
  payment_terms: string | null;
  warranty_terms: string | null;
  notes: string | null;
  discount_percentage: number;
  created_at: string;
}

export interface ProposalTemplateItem {
  id: string;
  template_id: string;
  device_id: string | null;
  device_name: string;
  quantity: number;
  unit_price: number;
  installation_price: number;
  subtotal: number;
}

interface SaveAsTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: {
    title: string;
    introduction: string;
    scope: string;
    validity_days: number;
    payment_terms: string;
    warranty_terms: string;
    notes: string;
    discount_percentage: number;
  };
  items: ProposalItem[];
}

export const SaveAsTemplateDialog = ({
  open,
  onOpenChange,
  formData,
  items,
}: SaveAsTemplateDialogProps) => {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(formData.title || "");
  }, [open, formData.title]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe um nome para o template");
      return;
    }
    if (items.length === 0) {
      toast.error("A proposta precisa ter pelo menos um item");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: tpl, error } = await supabase
        .from("proposal_templates")
        .insert({
          name: name.trim(),
          title: formData.title,
          introduction: formData.introduction,
          scope: formData.scope,
          validity_days: formData.validity_days,
          payment_terms: formData.payment_terms,
          warranty_terms: formData.warranty_terms,
          notes: formData.notes,
          discount_percentage: formData.discount_percentage,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;

      const itemsToInsert = items.map((it) => ({
        template_id: tpl.id,
        device_id: it.device_id,
        device_name: it.device_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        installation_price: it.installation_price,
        subtotal: it.subtotal,
      }));
      const { error: itemsErr } = await supabase
        .from("proposal_template_items")
        .insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      toast.success("Template salvo com sucesso!");
      onOpenChange(false);
      setName("");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Salve esta proposta como um template reutilizável para criar novas propostas com os mesmos materiais e textos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Nome do template</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Pacote CFTV Comercial Básico"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface UseTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: ProposalTemplate, items: ProposalTemplateItem[]) => void;
}

export const UseTemplateDialog = ({ open, onOpenChange, onSelect }: UseTemplateDialogProps) => {
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTemplates((data || []) as ProposalTemplate[]);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchTemplates();
  }, [open]);

  const handleSelect = async (tpl: ProposalTemplate) => {
    setLoadingId(tpl.id);
    try {
      const { data, error } = await supabase
        .from("proposal_template_items")
        .select("*")
        .eq("template_id", tpl.id);
      if (error) throw error;
      onSelect(tpl, (data || []) as ProposalTemplateItem[]);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar template");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este template?")) return;
    try {
      const { error } = await supabase.from("proposal_templates").delete().eq("id", id);
      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template excluído");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir template");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Usar Template de Proposta</DialogTitle>
          <DialogDescription>
            Selecione um template para preencher esta proposta. Você poderá editar tudo depois.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum template salvo. Crie uma proposta e clique em "Salvar como Template".
            </p>
          ) : (
            templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => handleSelect(tpl)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{tpl.name}</p>
                    {tpl.title && (
                      <p className="text-sm text-muted-foreground">{tpl.title}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {loadingId === tpl.id && (
                    <span className="text-xs text-muted-foreground">Carregando...</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(tpl.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
