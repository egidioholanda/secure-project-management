import { useEffect, useState } from "react";
import { AlertTriangle, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useProjectOrders } from "@/hooks/useProjectOrders";
import { BRL_EXACT, TRACKS, type TrackRow } from "./billingPhases";

const parseInput = (raw: string): number | null => {
  if (!raw.trim()) return null;
  const n = parseFloat(
    raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return isNaN(n) || n < 0 ? null : n;
};

export function EditOrderValueDialog({
  row,
  open,
  onOpenChange,
}: {
  row: TrackRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { updateOrderValue } = useProjectOrders();
  const [value, setValue] = useState("");
  /** o erro costuma ser de digitação na origem, então os dois lados estão errados */
  const [syncOpp, setSyncOpp] = useState(true);

  useEffect(() => {
    if (open && row) {
      setValue(String(row.value).replace(".", ","));
      setSyncOpp(!!row.project.opportunityId);
    }
  }, [open, row]);

  if (!row) return null;

  const novo = parseInput(value);
  const mudou = novo !== null && Math.abs(novo - row.value) > 0.01;
  const temOportunidade = !!row.project.opportunityId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Corrigir valor do pedido
          </DialogTitle>
          <DialogDescription>
            {row.project.name} · {row.categoryLabel} ·{" "}
            {TRACKS[row.track].label.toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor atual</span>
            <span className="font-bold tabular-nums">
              {BRL_EXACT.format(row.value)}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="novo-valor">Valor correto</Label>
            <Input
              id="novo-valor"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="text-right tabular-nums"
            />
          </div>

          {temOportunidade && (
            <div className="flex items-start gap-2.5 rounded-lg border border-border p-3">
              <Checkbox
                id="sync-opp"
                checked={syncOpp}
                onCheckedChange={(v) => setSyncOpp(!!v)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="sync-opp" className="text-sm cursor-pointer">
                  Corrigir também na oportunidade
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deixe marcado se o valor foi digitado errado na venda.
                  Desmarque se for aditivo ou reajuste — aí a venda continua
                  registrando o valor original.
                </p>
              </div>
            </div>
          )}

          {/* corrigir depois de faturado muda um mês já reportado */}
          {row.billed && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-500">
                Este pedido já foi faturado. Mudar o valor altera o total
                faturado do mês em que a nota saiu.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!mudou || updateOrderValue.isPending}
            onClick={() =>
              updateOrderValue.mutate(
                {
                  orderId: row.order.id,
                  value: novo!,
                  syncOpportunity: syncOpp && temOportunidade,
                },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {updateOrderValue.isPending ? "Salvando..." : "Corrigir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
