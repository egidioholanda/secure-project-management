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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import {
  BRL_COMPACT,
  MACRO_COLORS,
  OWNERS,
  TRACKS,
  TRACK_LIST,
  phasesToComplete,
  phasesToReopen,
  trackValue,
  type TrackKey,
  type TrackRow,
} from "./billingPhases";
import type { Project } from "@/types/project";

/** Uma trilha completa: as fases em ordem, marcáveis */
function TrackChecklist({
  project,
  track,
}: {
  project: Project;
  track: TrackKey;
}) {
  const { user, profile } = useAuthContext();
  const { phases, completePhase, reopenPhase, updatePhaseDate } = useProjectPhases();
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  // Data do evento, editável antes de marcar: projetos cadastrados meses depois
  // do faturamento precisam entrar no mês em que faturaram de verdade.
  const [dateDraft, setDateDraft] = useState<Record<number, string>>({});

  const def = TRACKS[track];
  const records = phases.filter(
    (p) => p.project_id === project.id && p.track === track,
  );
  const donePhases = records.map((r) => r.phase);
  const currentPhase =
    def.phases.find((p) => !donePhases.includes(p.n))?.n ?? def.phases.length + 1;

  const busy = completePhase.isPending || reopenPhase.isPending;
  const value = trackValue(project, track);
  const today = format(new Date(), "yyyy-MM-dd");

  const handleToggle = (n: number, done: boolean) => {
    if (done) {
      reopenPhase.mutate({
        projectId: project.id,
        track,
        phases: phasesToReopen(track, n, donePhases),
      });
      return;
    }
    completePhase.mutate({
      projectId: project.id,
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
          Pedido de {def.what}
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
                        onChange={(e) =>
                          e.target.value &&
                          updatePhaseDate.mutate({
                            id: rec.id,
                            completedAt: `${e.target.value}T12:00:00`,
                          })
                        }
                        title="Data em que isto aconteceu de fato"
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
  // Abre na trilha de onde o usuário clicou, mas as duas ficam à mão:
  // um pedido costuma travar por causa do outro.
  const [tab, setTab] = useState<TrackKey>(row?.track ?? "produto");

  if (!row) return null;
  const project = row.project;

  const progressOf = (track: TrackKey) => {
    const done = phases.filter(
      (p) => p.project_id === project.id && p.track === track,
    ).length;
    return `${done}/${TRACKS[track].phases.length}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TrackKey)}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="w-full flex-shrink-0">
            {TRACK_LIST.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="flex-1 gap-1.5">
                {t.key === "produto" ? (
                  <Package className="w-3.5 h-3.5" />
                ) : (
                  <Wrench className="w-3.5 h-3.5" />
                )}
                {t.label}
                <span className="text-[11px] text-muted-foreground font-mono">
                  {progressOf(t.key)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* min-h-0 é o que permite este filho encolher e o overflow valer */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-3 pr-1">
            {TRACK_LIST.map((t) => (
              <TabsContent key={t.key} value={t.key} className="mt-0">
                <TrackChecklist project={project} track={t.key} />
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3 flex-shrink-0">
          As duas trilhas são independentes: o pedido de produto e o de serviço
          são enviados e faturados em momentos diferentes. Marcar uma fase
          conclui as anteriores em branco da mesma trilha — exceto as marcadas
          como "fora de ordem", que podem acontecer antes e são registradas
          sozinhas. A data pode ser corrigida a qualquer momento: é ela que
          define em que mês o faturamento entra.
        </p>
      </DialogContent>
    </Dialog>
  );
}
