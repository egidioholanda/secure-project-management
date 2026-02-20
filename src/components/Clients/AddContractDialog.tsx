import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMaintenanceContracts } from "@/hooks/useClients";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function AddContractDialog({ open, onOpenChange, clientId }: Props) {
  const { createContract } = useMaintenanceContracts(clientId);
  const { register, handleSubmit, reset, setValue } = useForm<{
    title: string; type: string; periodicity: string; start_date: string;
    end_date: string; value: number; status: string; description: string;
  }>({
    defaultValues: { type: "both", periodicity: "monthly", status: "active", value: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await createContract.mutateAsync({
        client_id: clientId,
        title: data.title,
        type: data.type,
        periodicity: data.periodicity || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        value: parseFloat(data.value) || 0,
        status: data.status,
        description: data.description || null,
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
          <DialogTitle>Novo Contrato de Manutenção</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Título do Contrato *</Label>
              <Input {...register("title", { required: true })} placeholder="Ex: Contrato Anual 2025" />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select defaultValue="both" onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventiva</SelectItem>
                  <SelectItem value="corrective">Corretiva</SelectItem>
                  <SelectItem value="both">Preventiva + Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Periodicidade</Label>
              <Select defaultValue="monthly" onValueChange={(v) => setValue("periodicity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="semiannual">Semestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data de Início</Label>
              <Input {...register("start_date")} type="date" />
            </div>
            <div className="space-y-1">
              <Label>Data de Vencimento</Label>
              <Input {...register("end_date")} type="date" />
            </div>
            <div className="space-y-1">
              <Label>Valor Mensal (R$)</Label>
              <Input {...register("value")} type="number" step="0.01" placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select defaultValue="active" onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="expired">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Textarea {...register("description")} placeholder="Detalhes do contrato..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Criar Contrato"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
