import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/hooks/useClients";
import { useProjects } from "@/hooks/useProjects";
import { useClientGroups, GERAL_GROUP_ID } from "@/hooks/useClientGroups";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddClientDialog({ open, onOpenChange }: Props) {
  const { createClient } = useClients();
  const { projects } = useProjects();
  const { groups } = useClientGroups();
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await createClient.mutateAsync({
        name: data.name,
        cnpj: data.cnpj || null,
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        project_id: data.project_id && data.project_id !== "none" ? data.project_id : null,
        notes: data.notes || null,
        client_group_id: data.client_group_id || GERAL_GROUP_ID,
      });
      reset();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
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
              <Select onValueChange={(v) => setValue("project_id", v)}>
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
              <Label>Grupo de Clientes</Label>
              <Select
                defaultValue={GERAL_GROUP_ID}
                onValueChange={(v) => setValue("client_group_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
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
            <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Criar Cliente"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
