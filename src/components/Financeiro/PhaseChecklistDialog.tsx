import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Lock, RotateCcw, User } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import {
  MACROS,
  OWNERS,
  PHASES,
  getMacro,
  type PipelineRow,
} from "./billingPhases";

export function PhaseChecklistDialog({
  row,
  open,
  onOpenChange,
}: {
  row: PipelineRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user, profile } = useAuthContext();
  const { phases, completePhase, reopenPhase } = useProjectPhases();
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});

  if (!row) return null;

  const records = phases.filter((p) => p.project_id === row.project.id);
  const recordOf = (n: number) => records.find((r) => r.phase === n) ?? null;

  // Derivado dos records ATUAIS do hook, não de `row` — que é o snapshot de
  // quando o dialog abriu. Marcar duas fases seguidas sem fechar o dialog
  // reenviaria fases já gravadas e violaria a constraint UNIQUE.
  const donePhases = records.map((r) => r.phase);
  const currentPhase =
    PHASES.find((p) => !donePhases.includes(p.n))?.n ?? PHASES.length + 1;

  const handleToggle = (n: number, done: boolean) => {
    if (done) {
      reopenPhase.mutate({ projectId: row.project.id, phase: n });
      return;
    }
    completePhase.mutate({
      projectId: row.project.id,
      phase: n,
      note: noteDraft[n],
      userId: user?.id ?? null,
      userName: profile?.full_name ?? profile?.email ?? null,
      alreadyDone: donePhases,
    });
    setNoteDraft((prev) => ({ ...prev, [n]: "" }));
  };

  const busy = completePhase.isPending || reopenPhase.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-6">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {row.project.client || "Sem cliente"}
            </span>
            <span className="block text-lg font-bold leading-tight mt-0.5">
              {row.project.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3 -mr-3">
          <div className="space-y-1">
            {MACROS.map((macro) => (
              <div key={macro.key}>
                <div className="flex items-center gap-2 pt-3 pb-1.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: macro.color }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {macro.label}
                  </span>
                </div>

                {PHASES.filter((p) => p.macro === macro.key).map((def) => {
                  const rec = recordOf(def.n);
                  const done = !!rec;
                  const isCurrent = currentPhase === def.n;
                  const color = getMacro(def.macro).color;

                  return (
                    <div
                      key={def.n}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 mb-1 transition-colors",
                        isCurrent
                          ? "border-primary/60 bg-primary/5"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggle(def.n, done)}
                          aria-label={
                            done
                              ? `Reabrir fase ${def.n}`
                              : `Concluir fase ${def.n}`
                          }
                          className={cn(
                            "w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all disabled:opacity-50",
                            done
                              ? "border-transparent"
                              : "border-muted-foreground/40 hover:border-muted-foreground",
                          )}
                          style={done ? { backgroundColor: color } : undefined}
                        >
                          {done && <Check className="w-4 h-4 text-white" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground">
                              {def.n}
                            </span>
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                done && "text-muted-foreground",
                              )}
                            >
                              {def.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] font-mono uppercase h-5 px-1.5",
                                def.owner === "CLI" && "border-dashed",
                              )}
                            >
                              {def.owner === "CLI" && (
                                <Lock className="w-2.5 h-2.5 mr-1" />
                              )}
                              {def.owner}
                            </Badge>
                            {isCurrent && (
                              <Badge className="text-[10px] h-5 px-1.5">
                                fase atual
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5">
                            {def.description}
                            {" · "}
                            <span className="text-muted-foreground/70">
                              prazo {def.slaDays}d · {OWNERS[def.owner]}
                            </span>
                          </p>

                          {done && rec && (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 flex-wrap">
                              <Check className="w-3 h-3 text-emerald-500" />
                              {format(parseISO(rec.completed_at), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                              {rec.completed_by_name && (
                                <>
                                  <User className="w-3 h-3 ml-1" />
                                  {rec.completed_by_name}
                                </>
                              )}
                              {rec.note && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5"
                                >
                                  {def.noteLabel ?? "Obs"}: {rec.note}
                                </Badge>
                              )}
                            </p>
                          )}

                          {/* Campo do dado que a fase carrega (nº de conformidade / NF) */}
                          {!done && def.noteLabel && isCurrent && (
                            <Input
                              value={noteDraft[def.n] ?? ""}
                              onChange={(e) =>
                                setNoteDraft((prev) => ({
                                  ...prev,
                                  [def.n]: e.target.value,
                                }))
                              }
                              placeholder={`${def.noteLabel} (opcional)`}
                              className="h-8 text-sm mt-2 max-w-xs"
                            />
                          )}
                        </div>

                        {done && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => handleToggle(def.n, true)}
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
            ))}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Marcar uma fase conclui automaticamente as anteriores que ficaram em
          branco. Reabrir uma fase remove ela e as seguintes.
        </p>
      </DialogContent>
    </Dialog>
  );
}
