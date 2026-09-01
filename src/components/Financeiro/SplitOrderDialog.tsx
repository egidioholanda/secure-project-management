import { useEffect, useMemo, useState } from "react";
import { Split } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  useProjectOrders,
  type BillingCategory,
} from "@/hooks/useProjectOrders";
import { BRL_FULL, TRACKS, projectTypes, type TrackRow } from "./billingPhases";

const parseInput = (raw: string): number => {
  if (!raw.trim()) return 0;
  const n = parseFloat(
    raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return isNaN(n) ? 0 : n;
};

/** casa "Controle de Acesso" do campo `type` com o slug da categoria */
const matchCategory = (
  label: string,
  categories: BillingCategory[],
): string | null => {
  const norm = (v: string) =>
    v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const t = norm(label);
  return categories.find((c) => norm(c.label) === t)?.slug ?? null;
};

export function SplitOrderDialog({
  row,
  open,
  onOpenChange,
}: {
  row: TrackRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { categories, splitOrder } = useProjectOrders();
  const [values, setValues] = useState<Record<string, string>>({});

  /** as modalidades declaradas no projeto são a sugestão de divisão */
  const suggested = useMemo(() => {
    if (!row) return [];
    return projectTypes(row.project.type)
      .map((t) => {
        const slug = matchCategory(t, categories);
        return slug ? { slug, label: t } : null;
      })
      .filter(Boolean) as { slug: string; label: string }[];
  }, [row, categories]);

  useEffect(() => {
    if (open) setValues({});
  }, [open, row?.order.id]);

  if (!row) return null;

  const total = row.value;
  const sum = suggested.reduce((s, c) => s + parseInput(values[c.slug] ?? ""), 0);
  const diff = total - sum;
  const matches = Math.abs(diff) < 0.01;
  const filled = suggested.filter((c) => parseInput(values[c.slug] ?? "") > 0);
  const canSplit = matches && filled.length >= 2 && !splitOrder.isPending;

  const handleSplit = () => {
    splitOrder.mutate(
      {
        orderId: row.order.id,
        parts: filled.map((c) => ({
          category: c.slug,
          value: parseInput(values[c.slug] ?? ""),
        })),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-4 h-4" />
            Dividir por modalidade
          </DialogTitle>
          <DialogDescription>
            {row.project.name} · pedido de {TRACKS[row.track].what}
          </DialogDescription>
        </DialogHeader>

        {suggested.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4">
            Este projeto tem só uma modalidade declarada
            {suggested[0] ? ` (${suggested[0].label})` : ""}. Para dividir,
            informe as modalidades no cadastro do projeto.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total do pedido</span>
              <span className="font-bold tabular-nums">{BRL_FULL.format(total)}</span>
            </div>

            <div className="space-y-2">
              {suggested.map((c) => (
                <div key={c.slug} className="flex items-center gap-3">
                  <Label
                    htmlFor={`split-${c.slug}`}
                    className="text-sm font-normal flex-1"
                  >
                    {c.label}
                  </Label>
                  <Input
                    id={`split-${c.slug}`}
                    value={values[c.slug] ?? ""}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, [c.slug]: e.target.value }))
                    }
                    placeholder="0,00"
                    className="h-9 w-40 text-right tabular-nums"
                  />
                </div>
              ))}
            </div>

            {/* a conferência é o coração do diálogo: dividir errado inventa ou
                some com dinheiro, e ninguém percebe depois */}
            <div
              className={cn(
                "rounded-lg border p-3 text-sm",
                matches
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-amber-500/50 bg-amber-500/5",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Soma das partes</span>
                <span className="font-bold tabular-nums">{BRL_FULL.format(sum)}</span>
              </div>
              <p
                className={cn(
                  "text-xs mt-1",
                  matches ? "text-emerald-500" : "text-amber-500",
                )}
              >
                {matches
                  ? "✓ confere com o total"
                  : diff > 0
                    ? `Faltam ${BRL_FULL.format(diff)}`
                    : `Excedem ${BRL_FULL.format(-diff)}`}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              As fases já marcadas são copiadas para cada pedido — elas
              aconteceram para todas as modalidades. O total faturado do projeto
              não muda.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSplit} disabled={!canSplit}>
            {splitOrder.isPending ? "Dividindo..." : "Dividir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
