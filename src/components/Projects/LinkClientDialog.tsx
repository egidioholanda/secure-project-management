import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import { linkProjectToClient } from "@/hooks/useProjects";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/types/project";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onLinked?: () => void;
}

export function LinkClientDialog({ open, onOpenChange, project, onLinked }: Props) {
  const { clients, createClient } = useClients();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"existing" | "new">(project.clientId ? "existing" : "new");
  const [selectedClientId, setSelectedClientId] = useState(project.clientId || "");
  const [loading, setLoading] = useState(false);

  // new client fields
  const [name, setName] = useState(project.client || "");
  const [cnpj, setCnpj] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(project.address || "");

  const handleLinkExisting = async () => {
    if (!selectedClientId) return toast.error("Selecione um cliente");
    setLoading(true);
    try {
      await linkProjectToClient(project.id, selectedClientId);
      toast.success("Projeto vinculado ao cliente");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onLinked?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao vincular: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!name) return toast.error("Informe o nome do cliente");
    setLoading(true);
    try {
      const created = await createClient.mutateAsync({
        name,
        cnpj: cnpj || null,
        contact_name: contact || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        project_id: project.id,
        notes: null,
      });
      await linkProjectToClient(project.id, created.id);
      toast.success("Cliente criado e projeto vinculado");
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onLinked?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao criar cliente: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular Projeto a Cliente</DialogTitle>
          <DialogDescription>
            Transforme este projeto em um cliente ou vincule-o a um cliente existente.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new">Tornar Cliente</TabsTrigger>
            <TabsTrigger value="existing">Vincular Existente</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome / Razão Social *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CNPJ / CPF</Label>
                <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Contato</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Endereço</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleCreateAndLink} disabled={loading}>
                {loading ? "Criando..." : "Criar e Vincular"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="existing" className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleLinkExisting} disabled={loading}>
                {loading ? "Vinculando..." : "Vincular"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
