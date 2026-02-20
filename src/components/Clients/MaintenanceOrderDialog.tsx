import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMaintenanceOrders, useMaintenanceContracts, MaintenanceOrder } from "@/hooks/useClients";
import { Camera, X, Eraser, PenLine } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  order?: MaintenanceOrder | null;
}

export function MaintenanceOrderDialog({ open, onOpenChange, clientId, order }: Props) {
  const { createOrder, updateOrder, uploadPhoto, uploadSignature } = useMaintenanceOrders(clientId);
  const { contracts } = useMaintenanceContracts(clientId);
  const { register, handleSubmit, reset, setValue, watch } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [equipmentInput, setEquipmentInput] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (order) {
      setValue("title", order.title);
      setValue("type", order.type);
      setValue("status", order.status);
      setValue("technician", order.technician || "");
      setValue("scheduled_date", order.scheduled_date || "");
      setValue("completed_date", order.completed_date || "");
      setValue("description", order.description || "");
      setValue("observations", order.observations || "");
      setValue("contract_id", order.contract_id || "");
      setEquipment(order.equipment_attended || []);
    } else {
      reset();
      setEquipment([]);
    }
  }, [order, open]);

  const addEquipment = () => {
    if (equipmentInput.trim()) {
      setEquipment((prev) => [...prev, equipmentInput.trim()]);
      setEquipmentInput("");
    }
  };

  const removeEquipment = (idx: number) => setEquipment((prev) => prev.filter((_, i) => i !== idx));

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasSigned(true);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order || !e.target.files?.length) return;
    setUploadingPhoto(true);
    try {
      for (const file of Array.from(e.target.files)) {
        await uploadPhoto(order.id, file);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const payload = {
        client_id: clientId,
        title: data.title,
        type: data.type || "preventive",
        status: data.status || "scheduled",
        technician: data.technician || null,
        scheduled_date: data.scheduled_date || null,
        completed_date: data.completed_date || null,
        description: data.description || null,
        observations: data.observations || null,
        equipment_attended: equipment.length ? equipment : null,
        contract_id: data.contract_id && data.contract_id !== "none" ? data.contract_id : null,
        signature_url: order?.signature_url || null,
      };

      let savedId = order?.id;
      if (order) {
        await updateOrder.mutateAsync({ id: order.id, ...payload });
      } else {
        const created = await createOrder.mutateAsync(payload);
        savedId = (created as any).id;
      }

      if (hasSigned && savedId && canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        await uploadSignature(savedId, dataUrl);
      }

      reset();
      setEquipment([]);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Título *</Label>
              <Input {...register("title", { required: true })} placeholder="Ex: Manutenção preventiva mensal" />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select defaultValue={order?.type || "preventive"} onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventive">Preventiva</SelectItem>
                  <SelectItem value="corrective">Corretiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select defaultValue={order?.status || "scheduled"} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Contrato vinculado</Label>
              <Select defaultValue={order?.contract_id || "none"} onValueChange={(v) => setValue("contract_id", v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Técnico Responsável</Label>
              <Input {...register("technician")} placeholder="Nome do técnico" />
            </div>
            <div className="space-y-1">
              <Label>Data Agendada</Label>
              <Input {...register("scheduled_date")} type="date" />
            </div>
            <div className="space-y-1">
              <Label>Data de Conclusão</Label>
              <Input {...register("completed_date")} type="date" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Descrição do Serviço</Label>
              <Textarea {...register("description")} placeholder="Detalhes do serviço a realizar..." rows={2} />
            </div>

            {/* Equipamentos */}
            <div className="col-span-2 space-y-2">
              <Label>Equipamentos Atendidos</Label>
              <div className="flex gap-2">
                <Input
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                  placeholder="Ex: DVR Principal, Câmera 01..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEquipment())}
                />
                <Button type="button" variant="outline" onClick={addEquipment}>Adicionar</Button>
              </div>
              {equipment.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {equipment.map((eq, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {eq}
                      <button type="button" onClick={() => removeEquipment(i)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Observações</Label>
              <Textarea {...register("observations")} placeholder="Observações finais, pendências..." rows={2} />
            </div>
          </div>

          {/* Upload de fotos — só em edição */}
          {order && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Camera className="w-4 h-4" /> Fotos e Evidências</Label>
              <div className="flex flex-wrap gap-2">
                {order.photos?.map((photo) => (
                  <img key={photo.id} src={photo.url} alt={photo.caption || "foto"} className="w-20 h-20 object-cover rounded-md border" />
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed border-muted-foreground/40 rounded-md flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              {uploadingPhoto && <p className="text-sm text-muted-foreground">Enviando foto...</p>}
            </div>
          )}

          {/* Assinatura digital */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><PenLine className="w-4 h-4" /> Assinatura Digital do Cliente</Label>
            {order?.signature_url && !hasSigned ? (
              <div className="space-y-2">
                <img src={order.signature_url} alt="Assinatura" className="border rounded-md max-h-24" />
                <Button type="button" variant="outline" size="sm" onClick={() => setHasSigned(true)}>Substituir assinatura</Button>
              </div>
            ) : (
              <div className="space-y-1">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={100}
                  className="border rounded-md bg-muted/20 cursor-crosshair w-full"
                  style={{ touchAction: "none" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={() => setIsDrawing(false)}
                  onMouseLeave={() => setIsDrawing(false)}
                />
                <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="gap-1">
                  <Eraser className="w-3 h-3" /> Limpar
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Salvando..." : order ? "Salvar" : "Criar OS"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
