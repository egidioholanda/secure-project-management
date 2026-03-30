import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients, Client } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
}

export function EditClientDialog({ open, onOpenChange, client }: Props) {
  const { updateClient } = useClients();
  const { projects } = useProjects();
  const { register, handleSubmit, reset, setValue } = useForm();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && client) {
      setValue("name", client.name);
      setValue("cnpj", client.cnpj || "");
      setValue("contact_name", client.contact_name || "");
      setValue("email", client.email || "");
      setValue("phone", client.phone || "");
      setValue("address", client.address || "");
      setValue("project_id", client.project_id || "none");
      setValue("notes", client.notes || "");
    }
  }, [open, client]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await updateClient.mutateAsync({
        id: client.id,
        name: data.name,
        cnpj: data.cnpj || null,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        project_id: data.project_id && data.project_id !== "none" ? data.project_id : null,
        notes: data.notes || null,
      });
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nome / Razão Social *</Label>
              <Input {...register("name", { required: true })} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-1">
              <Label>CNPJ / CPF</Label>
              <Input {...register("cnpj")} placeholder="00.000.000/0001-00" />
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input {...register("phone")} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label>Nome do Contato</Label>
              <Input {...register("contact_name")} placeholder="Nome do responsável" />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input {...register("email")} type="email" placeholder="email@empresa.com" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Endereço</Label>
              <Input {...register("address")} placeholder="Rua, número, cidade" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Projeto vinculado</Label>
              <Select defaultValue={client.project_id || "none"} onValueChange={(v) => setValue("project_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar projeto (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Observações</Label>
              <Textarea {...register("notes")} placeholder="Informações adicionais..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
