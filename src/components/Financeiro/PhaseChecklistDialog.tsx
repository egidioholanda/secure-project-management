import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Lock, RotateCcw, User, Package, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const { phases, completePhase, reopenPhase } = useProjectPhases();
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});

  const def = TRACKS[track];
  const records = phases.filter(
    (p) => p.project_id === project.id && p.track === track,
  );
  const donePhases = records.map((r) => r.phase);
  const currentPhase =
    def.phases.find((p) => !donePhases.includes(p.n))?.n ?? def.phases.length + 1;

  const busy = completePhase.isPending || reopenPhase.isPending;
  const value = trackValue(project, track);

  const handleToggle = (n: number, done: boolean) => {
    if (done) {
      reopenPhase.mutate({ projectId: project.id, track, phase: n });
      return;
    }
    completePhase.mutate({
      projectId: project.id,
      track,
      phase: n,
      note: noteDraft[n],
      userId: user?.id ?? null,
      userName: profile?.full_name ?? profile?.email ?? null,
      alreadyDone: donePhases,
    });
    setNoteDraft((prev) => ({ ...prev, [n]: "" }));
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
                      {format(parseISO(rec.completed_at), "dd/MM/yyyy", { locale: ptBR })}
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

                  {!done && phase.noteLabel && isCurrent && (
                    <Input
                      value={noteDraft[phase.n] ?? ""}
                      onChange={(e) =>
                        setNoteDraft((prev) => ({ ...prev, [phase.n]: e.target.value }))
                      }
                      placeholder={`${phase.noteLabel} (opcional)`}
                      className="h-8 text-sm mt-2 max-w-xs"
                    />
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {project.client || "Sem cliente"}
            </span>
            <span className="block text-lg font-bold leading-tight mt-0.5">
              {project.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TrackKey)}>
          <TabsList className="w-full">
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

          <ScrollArea className="max-h-[58vh] pr-3 -mr-3 mt-3">
            {TRACK_LIST.map((t) => (
              <TabsContent key={t.key} value={t.key} className="mt-0">
                <TrackChecklist project={project} track={t.key} />
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          As duas trilhas são independentes: o pedido de produto e o de serviço
          são enviados e faturados em momentos diferentes. Marcar uma fase
          conclui as anteriores em branco da mesma trilha.
        </p>
      </DialogContent>
    </Dialog>
  );
}
