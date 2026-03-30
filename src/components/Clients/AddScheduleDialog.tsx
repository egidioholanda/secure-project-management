import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMaintenanceSchedules } from "@/hooks/useMaintenanceSchedules";
import { useMaintenanceContracts } from "@/hooks/useClients";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function AddScheduleDialog({ open, onOpenChange, clientId }: Props) {
  const { createSchedule } = useMaintenanceSchedules(clientId);
  const { contracts } = useMaintenanceContracts(clientId);
  const { register, handleSubmit, reset, setValue, watch } = useForm<{
    title: string;
    type: string;
    periodicity: string;
    next_date: string;
    technician: string;
    description: string;
    notify_7_days: boolean;
    notify_3_days: boolean;
    notify_email: string;
    contract_id: string;
  }>({
    defaultValues: {
      type: "preventive",
      periodicity: "monthly",
      notify_7_days: true,
      notify_3_days: true,
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  const activeContracts = contracts.filter((c) => c.status === "active");

  const handleContractSelect = (contractId: string) => {
    setValue("contract_id", contractId === "none" ? "" : contractId);
    if (contractId !== "none") {
      const contract = contracts.find((c) => c.id === contractId);
      if (contract) {
        if (contract.periodicity) setValue("periodicity", contract.periodicity);
        if (contract.type) setValue("type", contract.type);
        if (!watch("title")) setValue("title", `Manutenção - ${contract.title}`);
      }
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      await createSchedule.mutateAsync({
        client_id: clientId,
        contract_id: data.contract_id || null,
        title: data.title,
        type: data.type,
        periodicity: data.periodicity,
        next_date: data.next_date,
        technician: data.technician || null,
        description: data.description || null,
        is_active: true,
        notify_7_days: data.notify_7_days ?? true,
        notify_3_days: data.notify_3_days ?? true,
        notify_email: data.notify_email || null,
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
          <DialogTitle>Novo Agendamento Recorrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {activeContracts.length > 0 && (
              <div className="col-span-2 space-y-1">
                <Label>Vincular a Contrato (opcional)</Label>
                <Select onValueChange={handleContractSelect}>
                  <SelectTrigger><SelectValue placeholder="Selecione um contrato..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {activeContracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="col-span-2 space-y-1">
              <Label>Título *</Label>
              <Input {...register("title", { required: true })} placeholder="Ex: Manutenção Preventiva Mensal" />
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select defaultValue="preventive" onValueChange={(v) => setValue("type", v)}>
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
              <Label>Próxima Data *</Label>
              <Input {...register("next_date", { required: true })} type="date" />
            </div>

            <div className="space-y-1">
              <Label>Técnico Responsável</Label>
              <Input {...register("technician")} placeholder="Nome do técnico" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Email para Notificação</Label>
              <Input {...register("notify_email")} type="email" placeholder="email@exemplo.com" />
            </div>

            <div className="col-span-2 space-y-3 border rounded-lg p-3">
              <p className="text-sm font-medium">Notificações</p>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Notificar 7 dias antes</Label>
                <Switch defaultChecked onCheckedChange={(v) => setValue("notify_7_days", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Notificar 3 dias antes</Label>
                <Switch defaultChecked onCheckedChange={(v) => setValue("notify_3_days", v)} />
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Textarea {...register("description")} placeholder="Detalhes da manutenção recorrente..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : "Criar Agendamento"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
