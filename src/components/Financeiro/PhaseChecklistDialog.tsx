import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Lock, RotateCcw, User, Package, Wrench, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import {
  BRL_COMPACT,
  MACRO_COLORS,
  OWNERS,
  TRACKS,
  datesToAlign,
  phasesToComplete,
  phasesToReopen,
  type TrackKey,
  type TrackRow,
} from "./billingPhases";
import { useProjectOrders, type ProjectOrder } from "@/hooks/useProjectOrders";

/** As fases de UM pedido, em ordem, marcáveis */
function TrackChecklist({
  order,
  categoryLabel,
}: {
  order: ProjectOrder;
  categoryLabel: string;
}) {
  const track = order.kind as TrackKey;
  const { user, profile } = useAuthContext();
  const { phases, completePhase, reopenPhase, updatePhaseDate } = useProjectPhases();
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  // Data do evento, editável antes de marcar: projetos cadastrados meses depois
  // do faturamento precisam entrar no mês em que faturaram de verdade.
  const [dateDraft, setDateDraft] = useState<Record<number, string>>({});

  const def = TRACKS[track];
  const records = phases.filter((p) => p.order_id === order.id);
  const donePhases = records.map((r) => r.phase);
  const currentPhase =
    def.phases.find((p) => !donePhases.includes(p.n))?.n ?? def.phases.length + 1;

  const busy = completePhase.isPending || reopenPhase.isPending;
  const value = order.value;
  const today = format(new Date(), "yyyy-MM-dd");

  const handleToggle = (n: number, done: boolean) => {
    if (done) {
      reopenPhase.mutate({
        orderId: order.id,
        phases: phasesToReopen(track, n, donePhases),
      });
      return;
    }
    completePhase.mutate({
      orderId: order.id,
      projectId: order.project_id,
      track,
      phase: n,
      phases: phasesToComplete(track, n, donePhases),
      completedAt: dateDraft[n] ? `${dateDraft[n]}T12:00:00` : null,
      note: noteDraft[n],
      userId: user?.id ?? null,
      userName: profile?.full_name ?? profile?.email ?? null,
    });
    setNoteDraft((prev) => ({ ...prev, [n]: "" }));
    setDateDraft((prev) => ({ ...prev, [n]: "" }));
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 pb-3">
        <p className="text-sm text-muted-foreground">
          {categoryLabel} · pedido de {def.what}
        </p>
        <p className="text-base font-bold tabular-nums">
          {value > 0 ? BRL_COMPACT(value) : "sem valor"}
        </p>
      </div>

      <div className="space-y-1">
        {def.phases.map((phase) => {
          const rec = records.find((r) => r.phase === phase.n) ?? null;
          const done = !!rec;
          const isCurrent = currentPhase === phase.n;
          const isBilling = phase.n === def.billingPhase;
          const color = MACRO_COLORS[phase.macro];

          return (
            <div
              key={phase.n}
              className={cn(
                "rounded-lg border px-3 py-2.5 transition-colors",
                isCurrent ? "border-primary/60 bg-primary/5" : "border-border",
                isBilling && done && "border-emerald-500/50 bg-emerald-500/5",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggle(phase.n, done)}
                  aria-label={done ? `Reabrir fase ${phase.n}` : `Concluir fase ${phase.n}`}
                  className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all disabled:opacity-50",
                    done ? "border-transparent" : "border-muted-foreground/40 hover:border-muted-foreground",
                  )}
                  style={done ? { backgroundColor: color } : undefined}
                >
                  {done && <Check className="w-4 h-4 text-white" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{phase.n}</span>
                    <span className={cn("text-sm font-semibold", done && "text-muted-foreground")}>
                      {phase.label}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-mono uppercase h-5 px-1.5",
                        phase.owner === "CLI" && "border-dashed",
                      )}
                    >
                      {phase.owner === "CLI" && <Lock className="w-2.5 h-2.5 mr-1" />}
                      {phase.owner}
                    </Badge>
                    {isBilling && (
                      <Badge className="text-[10px] h-5 px-1.5 bg-emerald-600 hover:bg-emerald-600">
                        fatura aqui
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="text-[10px] h-5 px-1.5">fase atual</Badge>
                    )}
                    {phase.outOfOrder && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 px-1.5 border-dashed"
                        title="Pode ser marcada antes das fases anteriores"
                      >
                        fora de ordem
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phase.description}
                    {" · "}
                    <span className="text-muted-foreground/70">
                      prazo {phase.slaDays}d · {OWNERS[phase.owner]}
                    </span>
                  </p>

                  {done && rec && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <input
                        type="date"
                        value={format(parseISO(rec.completed_at), "yyyy-MM-dd")}
                        max={format(new Date(), "yyyy-MM-dd")}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          // as demais fases acompanham para a ordem não inverter
                          updatePhaseDate.mutate({
                            updates: datesToAlign(
                              records,
                              phase.n,
                              `${e.target.value}T12:00:00`,
                            ),
                          });
                        }}
                        title="Data em que isto aconteceu de fato. As outras fases acompanham para manter a ordem." 
                        className="bg-transparent border border-transparent hover:border-border focus:border-border rounded px-1 py-0.5 text-xs text-muted-foreground cursor-pointer"
                      />
                      {rec.completed_by_name && (
                        <>
                          <User className="w-3 h-3 ml-1" />
                          {rec.completed_by_name}
                        </>
                      )}
                      {rec.note && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {phase.noteLabel ?? "Obs"}: {rec.note}
                        </Badge>
                      )}
                    </p>
                  )}

                  {!done && isCurrent && (
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`date-${track}-${phase.n}`}
                          className="text-[11px] text-muted-foreground flex items-center gap-1"
                        >
                          <CalendarDays className="w-3 h-3" />
                          Data do evento
                        </Label>
                        <Input
                          id={`date-${track}-${phase.n}`}
                          type="date"
                          value={dateDraft[phase.n] ?? today}
                          max={today}
                          onChange={(e) =>
                            setDateDraft((prev) => ({ ...prev, [phase.n]: e.target.value }))
                          }
                          className="h-8 text-sm w-[150px]"
                        />
                      </div>
                      {phase.noteLabel && (
                        <div className="space-y-1 flex-1 min-w-[180px]">
                          <Label
                            htmlFor={`note-${track}-${phase.n}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            {phase.noteLabel}
                          </Label>
                          <Input
                            id={`note-${track}-${phase.n}`}
                            value={noteDraft[phase.n] ?? ""}
                            onChange={(e) =>
                              setNoteDraft((prev) => ({ ...prev, [phase.n]: e.target.value }))
                            }
                            placeholder="opcional"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {done && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => handleToggle(phase.n, true)}
                    className="h-7 px-2 text-xs text-muted-foreground flex-shrink-0"
                    title="Reabrir esta fase e as seguintes"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PhaseChecklistDialog({
  row,
  open,
  onOpenChange,
}: {
  row: TrackRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { phases } = useProjectPhases();
  const { orders, categories } = useProjectOrders();
  /** o pedido aberto: começa no que foi clicado */
  const [orderId, setOrderId] = useState<string | null>(null);

  const labelOf = (slug: string) =>
    categories.find((c) => c.slug === slug)?.label ?? slug;

  if (!row) return null;
  const project = row.project;

  /**
   * Todos os pedidos deste projeto. Com 3 modalidades × 2 tipos seriam 6
   * checklists — abas fixas não cabem, então a navegação é uma lista de
   * pedidos irmãos e o conteúdo mostra um de cada vez.
   */
  const siblings = orders
    .filter((o) => o.project_id === project.id)
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.kind.localeCompare(b.kind),
    );

  const current = siblings.find((o) => o.id === (orderId ?? row.order.id)) ?? row.order;

  const progressOf = (oid: string, kind: string) => {
    const done = phases.filter((p) => p.order_id === oid).length;
    return `${done}/${TRACKS[kind as TrackKey].phases.length}`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setOrderId(null);
        onOpenChange(v);
      }}
    >
      {/* DialogContent é `grid` sem altura máxima: com 8 fases o conteúdo
          crescia para fora da viewport e não havia o que rolar. Vira uma
          coluna flex limitada, com só a lista de fases rolando. */}
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] gap-0">
        <DialogHeader className="flex-shrink-0 pb-3">
          <DialogTitle className="pr-6">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {project.client || "Sem cliente"}
            </span>
            <span className="block text-lg font-bold leading-tight mt-0.5">
              {project.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Seletor de pedidos: some quando o projeto só tem um */}
        {siblings.length > 1 && (
          <div className="flex flex-wrap gap-1.5 flex-shrink-0 pb-1">
            {siblings.map((o) => {
              const isCurrent = o.id === current.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOrderId(o.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-muted-foreground",
                  )}
                >
                  {o.kind === "produto" ? (
                    <Package className="w-3.5 h-3.5" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium">{labelOf(o.category)}</span>
                  <span className="text-muted-foreground/70">
                    {o.kind === "produto" ? "produto" : "serviço"}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {progressOf(o.id, o.kind)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* min-h-0 é o que permite este filho encolher e o overflow valer */}
        <div className="flex-1 min-h-0 overflow-y-auto mt-3 pr-1">
          <TrackChecklist
            key={current.id}
            order={current}
            categoryLabel={labelOf(current.category)}
          />
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3 flex-shrink-0">
          Cada pedido é faturado por conta própria — por modalidade e entre
          produto e serviço. Marcar uma fase conclui as anteriores em branco do
          mesmo pedido, exceto as marcadas como "fora de ordem". A data pode ser
          corrigida a qualquer momento: é ela que define em que mês o
          faturamento entra.
        </p>
      </DialogContent>
    </Dialog>
  );
}
