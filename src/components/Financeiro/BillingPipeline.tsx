import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  Maximize2,
  Minimize2,
  Timer,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { PhaseChecklistDialog } from "./PhaseChecklistDialog";
import {
  BRL_COMPACT,
  BRL_FULL,
  MACROS,
  OWNERS,
  PHASES,
  TOTAL_PHASES,
  buildPipelineRows,
  getMacro,
  getPhase,
  type PipelineRow,
} from "./billingPhases";

type TabKey = "todos" | "travados" | "cliente" | "faturar";

const ROWS_STEP = 12;

// ── Trilha de 10 marcadores ──────────────────────────────────────────────────
// Nunca 10 rótulos por linha: os nomes vivem na legenda, aqui cada fase é um
// numeral agrupado por macro-etapa colorida. A fase atual é maior e meio-cheia,
// então a posição é legível por FORMA e TAMANHO, não só por cor.

function PhaseTrack({ row, big }: { row: PipelineRow; big: boolean }) {
  const dot = big ? 13 : 9;
  const currentDot = big ? 19 : 14;

  return (
    <div className="flex items-center" role="img"
      aria-label={
        row.isFinished
          ? "Todas as 10 fases concluídas"
          : `Fase ${row.currentPhase} de ${TOTAL_PHASES}`
      }
    >
      {MACROS.map((macro, mi) => (
        <div
          key={macro.key}
          className={cn("flex items-center", mi > 0 && (big ? "ml-3" : "ml-2"))}
        >
          {macro.phases.map((n, pi) => {
            const done = row.donePhases.includes(n);
            const isCurrent = row.currentPhase === n;
            const size = isCurrent ? currentDot : dot;

            return (
              <div key={n} className="flex items-center">
                {pi > 0 && (
                  <span
                    className="h-px w-1.5 flex-shrink-0"
                    style={{
                      backgroundColor: done ? macro.color : "hsl(var(--border))",
                    }}
                  />
                )}
                {/* Fase atual: maior + anel colorido + centro vazio. A posição
                    é legível por FORMA e TAMANHO, não só por cor. */}
                <span
                  className="rounded-full flex-shrink-0 box-content"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: done ? macro.color : "transparent",
                    border: done
                      ? "none"
                      : `${isCurrent ? 3 : 2}px solid ${
                          isCurrent ? macro.color : "hsl(var(--border))"
                        }`,
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Tag de dono ──────────────────────────────────────────────────────────────

function OwnerTag({ row }: { row: PipelineRow }) {
  if (!row.owner) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge
      variant="outline"
      title={OWNERS[row.owner]}
      className={cn(
        "text-[10px] font-mono uppercase h-5 px-1.5 w-[62px] justify-center",
        row.dependsOnClient && "border-dashed",
      )}
    >
      {row.dependsOnClient && <Lock className="w-2.5 h-2.5 mr-0.5" />}
      {row.owner}
    </Badge>
  );
}

// ── Mini KPI ─────────────────────────────────────────────────────────────────

function MiniKPI({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  big,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  big: boolean;
}) {
  return (
    <Card className="border border-border">
      <CardContent className={cn("p-4", big && "p-5")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p
              className={cn(
                "font-bold text-foreground mt-1 leading-none tabular-nums",
                big ? "text-2xl" : "text-xl",
              )}
            >
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {sub}
              </p>
            )}
          </div>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}
          >
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Painel ───────────────────────────────────────────────────────────────────

export function BillingPipeline() {
  const { allowedClientIds, allowedClientGroupIds } = useAuthContext();
  const { projects, loading: projectsLoading } = useProjects(
    allowedClientIds,
    allowedClientGroupIds,
  );
  const { phases, isLoading: phasesLoading } = useProjectPhases();

  const [tab, setTab] = useState<TabKey>("todos");
  const [clientFilter, setClientFilter] = useState("all");
  const [projector, setProjector] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ROWS_STEP);
  const [selected, setSelected] = useState<PipelineRow | null>(null);

  const isLoading = projectsLoading || phasesLoading;

  const rows = useMemo(
    () => buildPipelineRows(projects, phases),
    [projects, phases],
  );

  /** Projetos ainda no pipeline (as 10 fases não concluídas) */
  const open = useMemo(() => rows.filter((r) => !r.isFinished), [rows]);

  const clients = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.project.client).filter(Boolean))).sort(),
    [rows],
  );

  const metrics = useMemo(() => {
    const readyToBill = open.filter((r) => r.currentPhase >= 7);
    const late = open.filter((r) => r.isLate);
    const lateClient = late.filter((r) => r.dependsOnClient);
    const lateOurs = late.filter((r) => !r.dependsOnClient);

    const sum = (list: PipelineRow[]) => list.reduce((s, r) => s + r.value, 0);

    const oldestReady = readyToBill.reduce(
      (max, r) => Math.max(max, r.daysInPhase ?? 0),
      0,
    );

    // Lead time pedido → NF, entre projetos que já fecharam o ciclo
    const leads = rows
      .map((r) => r.leadTimeDays)
      .filter((n): n is number => n !== null);
    const avgLead = leads.length
      ? Math.round(leads.reduce((s, n) => s + n, 0) / leads.length)
      : null;

    // Gargalo: fase com maior valor parado
    const byPhase = new Map<number, { value: number; count: number }>();
    for (const r of open) {
      const cur = byPhase.get(r.currentPhase) ?? { value: 0, count: 0 };
      cur.value += r.value;
      cur.count += 1;
      byPhase.set(r.currentPhase, cur);
    }
    const bottleneck = Array.from(byPhase.entries()).sort(
      (a, b) => b[1].value - a[1].value,
    )[0];

    const byMacro = MACROS.map((m) => {
      const list = open.filter((r) => {
        const def = getPhase(r.currentPhase);
        return def?.macro === m.key;
      });
      return {
        ...m,
        value: sum(list),
        count: list.length,
        lateCount: list.filter((r) => r.isLate).length,
      };
    });

    return {
      readyToBillValue: sum(readyToBill),
      readyToBillCount: readyToBill.length,
      oldestReady,
      lateValue: sum(late),
      lateCount: late.length,
      lateOursValue: sum(lateOurs),
      lateClientValue: sum(lateClient),
      lateClientCount: lateClient.length,
      avgLead,
      leadCount: leads.length,
      bottleneck: bottleneck
        ? { phase: bottleneck[0], ...bottleneck[1] }
        : null,
      byMacro,
      pipelineTotal: sum(open),
      openCount: open.length,
      finishedCount: rows.length - open.length,
      noValueCount: open.filter((r) => !r.hasValue).length,
    };
  }, [rows, open]);

  const filtered = useMemo(() => {
    let list = open;
    if (clientFilter !== "all") {
      list = list.filter((r) => r.project.client === clientFilter);
    }
    if (tab === "travados") list = list.filter((r) => r.isLate);
    if (tab === "cliente") list = list.filter((r) => r.dependsOnClient);
    if (tab === "faturar") list = list.filter((r) => r.currentPhase >= 7);

    // Ordena por urgência financeira (R$ × dias parados); empate cai no valor
    return [...list].sort(
      (a, b) => b.urgency - a.urgency || b.value - a.value,
    );
  }, [open, tab, clientFilter]);

  const visible = filtered.slice(0, visibleCount);
  const maxMacroValue = Math.max(1, ...metrics.byMacro.map((m) => m.value));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-56 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Faturamento de projetos
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setProjector((v) => !v)}
          className="h-8 text-xs"
          title="Aumenta tipografia e marcadores para apresentação em projetor"
        >
          {projector ? (
            <Minimize2 className="w-3.5 h-3.5 mr-1.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
          )}
          {projector ? "Modo normal" : "Modo projetor"}
        </Button>
      </div>

      {/* ─── KPIs de faturamento de projetos ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKPI
          label="Pronto para faturar"
          value={BRL_COMPACT(metrics.readyToBillValue)}
          sub={
            metrics.readyToBillCount > 0
              ? `${metrics.readyToBillCount} projeto${metrics.readyToBillCount !== 1 ? "s" : ""} · mais antigo há ${metrics.oldestReady}d`
              : "Nenhum projeto aguardando NF"
          }
          icon={Wallet}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          big={projector}
        />
        <MiniKPI
          label="Travado acima do prazo"
          value={BRL_COMPACT(metrics.lateValue)}
          sub={
            metrics.lateCount > 0 ? (
              <>
                nosso {BRL_COMPACT(metrics.lateOursValue)} ·{" "}
                <span className="whitespace-nowrap">
                  🔒 cliente {BRL_COMPACT(metrics.lateClientValue)}
                </span>
              </>
            ) : (
              "Tudo dentro do prazo"
            )
          }
          icon={AlertTriangle}
          iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          big={projector}
        />
        <MiniKPI
          label="Prazo pedido → NF"
          value={metrics.avgLead !== null ? `${metrics.avgLead} d` : "—"}
          sub={
            metrics.avgLead !== null
              ? `média de ${metrics.leadCount} projeto${metrics.leadCount !== 1 ? "s" : ""} faturado${metrics.leadCount !== 1 ? "s" : ""}`
              : "Nenhum ciclo completo ainda"
          }
          icon={Timer}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          big={projector}
        />
        <MiniKPI
          label="Gargalo"
          value={
            metrics.bottleneck
              ? `${metrics.bottleneck.phase} ${getPhase(metrics.bottleneck.phase)?.short ?? ""}`
              : "—"
          }
          sub={
            metrics.bottleneck
              ? `${BRL_COMPACT(metrics.bottleneck.value)} · ${metrics.bottleneck.count} projeto${metrics.bottleneck.count !== 1 ? "s" : ""}`
              : "Pipeline vazio"
          }
          icon={Clock}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          big={projector}
        />
      </div>

      <Card className="border border-border">
        <CardContent className={cn("p-5", projector && "p-6")}>
          {/* ─── Faixa de macro-etapas: o resumo executivo ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            {metrics.byMacro.map((m) => (
              <div key={m.key}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60 font-mono">
                    {m.phases[0]}–{m.phases[m.phases.length - 1]}
                  </span>
                </div>
                <p
                  className={cn(
                    "font-bold tabular-nums mt-1 leading-none",
                    projector ? "text-2xl" : "text-lg",
                  )}
                >
                  {BRL_COMPACT(m.value)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {m.count} projeto{m.count !== 1 ? "s" : ""}
                  {m.lateCount > 0 && (
                    <span className="text-red-500 font-medium">
                      {" "}
                      · ⚠ {m.lateCount}
                    </span>
                  )}
                </p>
                {/* barra proporcional ao valor parado na macro-etapa */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(m.value / maxMacroValue) * 100}%`,
                      backgroundColor: m.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-3">
            <span className="font-semibold text-foreground">
              {BRL_FULL.format(metrics.pipelineTotal)}
            </span>{" "}
            em {metrics.openCount} projeto
            {metrics.openCount !== 1 ? "s" : ""} no pipeline
            {metrics.finishedCount > 0 && (
              <> · {metrics.finishedCount} já faturado{metrics.finishedCount !== 1 ? "s" : ""}</>
            )}
            {metrics.noValueCount > 0 && (
              <span className="text-amber-500">
                {" "}
                · ⚠ {metrics.noValueCount} sem valor informado, fora dos totais
              </span>
            )}
          </p>

          {/* ─── Abas + filtro ─── */}
          <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as TabKey);
                setVisibleCount(ROWS_STEP);
              }}
            >
              <TabsList className="h-9">
                <TabsTrigger value="todos" className="text-xs">
                  Todos ({metrics.openCount})
                </TabsTrigger>
                <TabsTrigger value="travados" className="text-xs">
                  ⚠ Travados ({metrics.lateCount})
                </TabsTrigger>
                <TabsTrigger value="cliente" className="text-xs">
                  🔒 Cliente ({metrics.lateClientCount})
                </TabsTrigger>
                <TabsTrigger value="faturar" className="text-xs">
                  Prontos p/ NF ({metrics.readyToBillCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select
              value={clientFilter}
              onValueChange={(v) => {
                setClientFilter(v);
                setVisibleCount(ROWS_STEP);
              }}
            >
              <SelectTrigger className="h-9 w-52 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ─── Matriz ─── */}
          {visible.length === 0 ? (
            <EmptyState tab={tab} hasProjects={metrics.openCount > 0} />
          ) : (
            <div className="overflow-x-auto mt-4 -mx-1 px-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-3">Cliente · Projeto</th>
                    <th className="pb-2 pr-3 text-right">Valor</th>
                    <th className="pb-2 pr-3">Fases 1–10</th>
                    <th className="pb-2 pr-3">Fase atual</th>
                    <th className="pb-2 pr-3">Dono</th>
                    <th className="pb-2 pr-3 text-right">Parado</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const def = getPhase(row.currentPhase);
                    const macroColor = def ? getMacro(def.macro).color : undefined;

                    return (
                      <tr
                        key={row.project.id}
                        onClick={() => setSelected(row)}
                        className={cn(
                          "border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors",
                          row.isVeryLate && "bg-destructive/10",
                          row.isLate && !row.isVeryLate && "bg-destructive/5",
                        )}
                        style={
                          row.isVeryLate
                            ? { boxShadow: "inset 3px 0 0 hsl(var(--destructive))" }
                            : undefined
                        }
                      >
                        <td className={cn("py-3 pr-3", projector && "py-4")}>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate max-w-[200px]">
                            {row.project.client || "Sem cliente"}
                          </p>
                          <p
                            className={cn(
                              "font-semibold truncate max-w-[240px]",
                              projector ? "text-base" : "text-sm",
                            )}
                          >
                            {row.project.name}
                          </p>
                        </td>

                        <td
                          className={cn(
                            "py-3 pr-3 text-right tabular-nums whitespace-nowrap",
                            projector ? "text-base" : "text-sm",
                            !row.hasValue && "text-muted-foreground",
                          )}
                        >
                          {row.hasValue ? BRL_COMPACT(row.value) : "—"}
                        </td>

                        <td className="py-3 pr-3">
                          <PhaseTrack row={row} big={projector} />
                        </td>

                        <td className="py-3 pr-3 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="text-xs font-mono font-bold"
                              style={{ color: macroColor }}
                            >
                              {row.currentPhase}
                            </span>
                            <span
                              className={cn(
                                projector ? "text-sm" : "text-[13px]",
                              )}
                            >
                              {def?.label ?? "—"}
                            </span>
                          </span>
                          {row.notStarted && (
                            <span className="text-[11px] text-amber-500">
                              nada marcado ainda
                            </span>
                          )}
                        </td>

                        <td className="py-3 pr-3">
                          <OwnerTag row={row} />
                        </td>

                        <td
                          className={cn(
                            "py-3 pr-3 text-right whitespace-nowrap tabular-nums",
                            projector ? "text-sm" : "text-[13px]",
                            row.isLate
                              ? "text-red-500 font-semibold"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.daysInPhase !== null ? (
                            <>
                              {row.daysInPhase} d{row.isLate && " ⚠"}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(row);
                            }}
                            className="h-7 px-2 text-xs text-muted-foreground"
                          >
                            Fases
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filtered.length > visible.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount((c) => c + ROWS_STEP)}
                  className="mt-3 text-xs text-muted-foreground"
                >
                  Mostrar mais {Math.min(ROWS_STEP, filtered.length - visible.length)}{" "}
                  (de {filtered.length})
                </Button>
              )}
            </div>
          )}

          {/* ─── Legenda fixa: é o que torna os numerais compreensíveis ─── */}
          <div className="border-t border-border mt-4 pt-3 space-y-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {PHASES.map((p) => (
                <span
                  key={p.n}
                  className="text-[11px] text-muted-foreground whitespace-nowrap"
                >
                  <span
                    className="font-mono font-bold"
                    style={{ color: getMacro(p.macro).color }}
                  >
                    {p.n}
                  </span>{" "}
                  {p.label}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              Marcador cheio = fase concluída · anel = fase atual · vazio =
              pendente · ⚠ acima do prazo ·{" "}
              <Lock className="w-2.5 h-2.5 inline-block" /> borda tracejada =
              depende do cliente
            </p>
          </div>
        </CardContent>
      </Card>

      <PhaseChecklistDialog
        row={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}

function EmptyState({ tab, hasProjects }: { tab: TabKey; hasProjects: boolean }) {
  if (tab === "travados") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
        <p className="font-semibold">Nenhum projeto acima do prazo</p>
        <p className="text-sm text-muted-foreground mt-1">
          Todas as fases dentro do prazo previsto.
        </p>
      </div>
    );
  }

  if (!hasProjects) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wallet className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="font-semibold">Nenhum projeto no pipeline de faturamento</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Os projetos aparecem aqui automaticamente. Clique em um projeto para
          marcar as fases concluídas.
        </p>
      </div>
    );
  }

  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Nenhum projeto nesta aba com os filtros atuais.
    </div>
  );
}
