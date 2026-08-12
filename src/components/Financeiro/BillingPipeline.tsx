import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Lock,
  Maximize2,
  Minimize2,
  Timer,
  Wallet,
  X,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProjects } from "@/hooks/useProjects";
import { useClientGroups } from "@/hooks/useClientGroups";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { PhaseChecklistDialog } from "./PhaseChecklistDialog";
import {
  BRL_COMPACT,
  BRL_FULL,
  MACRO_COLORS,
  MACRO_LABELS,
  OWNERS,
  PERIOD_OPTIONS,
  TRACKS,
  TRACK_LIST,
  buildTrackRows,
  getDateThreshold,
  getPhase,
  projectTypes,
  toggleArr,
  trackMacros,
  type MacroKey,
  type OwnerKey,
  type TrackKey,
  type TrackRow,
} from "./billingPhases";

type TabKey = "todos" | "travados" | "cliente" | "faturar";

const PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 10;

/**
 * Números de página com elipse: primeira, última e a janela ao redor da atual.
 * Com 20 páginas, imprimir 20 botões estoura a largura no projetor.
 */
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) out.push("…");
  for (let p = from; p <= to; p++) out.push(p);
  if (to < total - 1) out.push("…");
  out.push(total);
  return out;
}

// ── Trilha de marcadores ─────────────────────────────────────────────────────
// Os nomes das fases vivem na legenda; aqui cada fase é um numeral agrupado por
// macro-etapa colorida. A fase atual é maior e vazada, então a posição é
// legível por FORMA e TAMANHO, não só por cor.

function PhaseTrack({ row, big }: { row: TrackRow; big: boolean }) {
  const dot = big ? 13 : 9;
  const currentDot = big ? 19 : 14;
  const macros = trackMacros(row.track);
  const total = TRACKS[row.track].phases.length;

  return (
    <div className="flex items-center" role="img"
      aria-label={
        row.isFinished
          ? `Trilha de ${TRACKS[row.track].label.toLowerCase()} concluída`
          : `Fase ${row.currentPhase} de ${total}`
      }
    >
      {macros.map((macro, mi) => (
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

function OwnerTag({ row }: { row: TrackRow }) {
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

// ── Peças da barra de filtros ────────────────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterCheck({
  id,
  label,
  checked,
  onToggle,
  color,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={onToggle} />
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <Label htmlFor={id} className="text-sm font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
  color,
}: {
  label: string;
  onRemove: () => void;
  color?: string;
}) {
  return (
    <Badge
      variant="secondary"
      onClick={onRemove}
      className="gap-1 cursor-pointer h-9 px-3 font-normal"
    >
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="truncate max-w-[160px]">{label}</span>
      <X className="w-3 h-3 flex-shrink-0" />
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
  const { groups } = useClientGroups();

  // Produto e serviço são pedidos independentes: cada aba tem seus próprios
  // KPIs, seu próprio gargalo e seu próprio atraso.
  const [track, setTrack] = useState<TrackKey>("produto");
  const [tab, setTab] = useState<TabKey>("todos");
  const [projector, setProjector] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<TrackRow | null>(null);

  // ── Filtros ──
  const [period, setPeriod] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [filterGroups, setFilterGroups] = useState<string[]>([]);
  const [filterMacros, setFilterMacros] = useState<MacroKey[]>([]);
  const [filterOwners, setFilterOwners] = useState<OwnerKey[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

  const isLoading = projectsLoading || phasesLoading;

  const rows = useMemo(
    () => buildTrackRows(projects, phases, track),
    [projects, phases, track],
  );

  const trackDef = TRACKS[track];
  /** fase a partir da qual só falta a nota fiscal desta trilha */
  const readyPhase = trackDef.billingPhase;

  /** Projetos ainda no pipeline (as 10 fases não concluídas) */
  const open = useMemo(() => rows.filter((r) => !r.isFinished), [rows]);

  const clients = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.project.client).filter(Boolean))).sort(),
    [rows],
  );

  const allTypes = useMemo(
    () =>
      Array.from(
        new Set(rows.flatMap((r) => projectTypes(r.project.type))),
      ).sort(),
    [rows],
  );

  /** Só os grupos que o perfil do usuário pode ver */
  const visibleGroups = useMemo(
    () =>
      allowedClientGroupIds === null
        ? groups
        : groups.filter((g) => allowedClientGroupIds.includes(g.id)),
    [groups, allowedClientGroupIds],
  );

  // Todos os filtros recortam o universo: KPIs, faixa de macro-etapas,
  // contagens das abas e tabela olham para o MESMO conjunto. A aba é navegação
  // dentro do recorte, não mais um filtro.
  const scoped = useMemo(() => {
    const threshold = getDateThreshold(period);
    return open.filter((r) => {
      // um projeto sem valor nesta trilha não tem esse pedido: mostrá-lo aqui
      // encheria a aba de linhas que nunca vão faturar
      if (!r.hasValue) return false;
      if (threshold && (!r.enteredAt || r.enteredAt < threshold)) return false;
      if (clientFilter !== "all" && r.project.client !== clientFilter) return false;
      if (filterGroups.length) {
        const g = r.project.clientGroupId ?? "none";
        if (!filterGroups.includes(g)) return false;
      }
      if (filterTypes.length) {
        const types = projectTypes(r.project.type);
        if (!types.some((t) => filterTypes.includes(t))) return false;
      }
      if (filterMacros.length) {
        const def = getPhase(track, r.currentPhase);
        if (!def || !filterMacros.includes(def.macro)) return false;
      }
      if (filterOwners.length) {
        if (!r.owner || !filterOwners.includes(r.owner)) return false;
      }
      return true;
    });
  }, [
    open,
    track,
    period,
    clientFilter,
    filterGroups,
    filterTypes,
    filterMacros,
    filterOwners,
  ]);

  /** projetos que não têm pedido desta trilha — omitidos, mas informados */
  const withoutThisTrack = useMemo(
    () => open.filter((r) => !r.hasValue).length,
    [open],
  );

  const activeFilterCount =
    (period !== "all" ? 1 : 0) +
    (clientFilter !== "all" ? 1 : 0) +
    filterGroups.length +
    filterMacros.length +
    filterOwners.length +
    filterTypes.length;

  const resetPaging = () => setPage(1);

  const clearFilters = () => {
    setPeriod("all");
    setClientFilter("all");
    setFilterGroups([]);
    setFilterMacros([]);
    setFilterOwners([]);
    setFilterTypes([]);
    resetPaging();
  };

  // Projetos JÁ faturados sob o mesmo recorte de período/cliente/grupo/tipo —
  // filtros de fase e dono não se aplicam a quem já terminou as 10 fases.
  // Sem isso o "prazo pedido → NF" ignoraria os filtros e contradiria os outros KPIs.
  const scopedFinished = useMemo(() => {
    const threshold = getDateThreshold(period);
    return rows.filter((r) => {
      if (!r.isFinished) return false;
      if (threshold && (!r.enteredAt || r.enteredAt < threshold)) return false;
      if (clientFilter !== "all" && r.project.client !== clientFilter) return false;
      if (filterGroups.length) {
        const g = r.project.clientGroupId ?? "none";
        if (!filterGroups.includes(g)) return false;
      }
      if (filterTypes.length) {
        const types = projectTypes(r.project.type);
        if (!types.some((t) => filterTypes.includes(t))) return false;
      }
      return true;
    });
  }, [rows, period, clientFilter, filterGroups, filterTypes]);

  const metrics = useMemo(() => {
    // Fase 7+ = obra aceita, aguardando a NF de serviço. O que falta faturar
    // aqui é o serviço — o material saiu na fase 5.
    const readyToBill = scoped.filter((r) => r.currentPhase >= readyPhase);
    const late = scoped.filter((r) => r.isLate);
    const lateClient = late.filter((r) => r.dependsOnClient);
    const lateOurs = late.filter((r) => !r.dependsOnClient);

    // Somamos o PENDENTE, não o total: a partir da fase 5 o produto já foi
    // faturado, e contá-lo de novo inflava todos os KPIs de dinheiro parado.
    const sum = (list: TrackRow[]) => list.reduce((s, r) => s + r.pendingValue, 0);
    const sumTotal = (list: TrackRow[]) => list.reduce((s, r) => s + r.value, 0);

    const oldestReady = readyToBill.reduce(
      (max, r) => Math.max(max, r.daysInPhase ?? 0),
      0,
    );

    // Lead time pedido → NF, entre projetos que já fecharam o ciclo
    const leads = scopedFinished
      .map((r) => r.leadTimeDays)
      .filter((n): n is number => n !== null);
    const avgLead = leads.length
      ? Math.round(leads.reduce((s, n) => s + n, 0) / leads.length)
      : null;

    // Gargalo: fase com maior valor parado
    const byPhase = new Map<number, { value: number; count: number }>();
    for (const r of scoped) {
      const cur = byPhase.get(r.currentPhase) ?? { value: 0, count: 0 };
      cur.value += r.pendingValue;
      cur.count += 1;
      byPhase.set(r.currentPhase, cur);
    }
    const bottleneck = Array.from(byPhase.entries()).sort(
      (a, b) => b[1].value - a[1].value,
    )[0];

    const byMacro = trackMacros(track).map((m) => {
      const list = scoped.filter((r) => {
        const def = getPhase(track, r.currentPhase);
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
      pipelineTotal: sum(scoped),
      contractedTotal: sumTotal(scoped),
      billedTotal: scoped.reduce((s, r) => s + (r.billed ? r.value : 0), 0),
      openCount: scoped.length,
      finishedCount: scopedFinished.length,
      noValueCount: scoped.filter((r) => !r.hasValue).length,
    };
  }, [scoped, scopedFinished, track, readyPhase]);

  const filtered = useMemo(() => {
    let list = scoped;
    if (tab === "travados") list = list.filter((r) => r.isLate);
    if (tab === "cliente") list = list.filter((r) => r.dependsOnClient);
    if (tab === "faturar") list = list.filter((r) => r.currentPhase >= readyPhase);

    // Ordena por urgência financeira (R$ × dias parados); empate cai no valor
    return [...list].sort(
      (a, b) => b.urgency - a.urgency || b.pendingValue - a.pendingValue,
    );
  }, [scoped, tab, readyPhase]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clampar em vez de usar useEffect: se um filtro encolhe a lista e a página
  // atual passa a não existir, o render já cai na última válida.
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visible = filtered.slice(startIndex, startIndex + pageSize);

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
          Faturamento de projetos · pedido de {trackDef.label.toLowerCase()}
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

      {/* ─── Barra de filtros ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={period}
          onValueChange={(v) => {
            setPeriod(v);
            resetPaging();
          }}
        >
          <SelectTrigger className="h-9 w-48 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={clientFilter}
          onValueChange={(v) => {
            setClientFilter(v);
            resetPaging();
          }}
        >
          <SelectTrigger className="h-9 w-56 text-sm">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-[10px]">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <ScrollArea className="max-h-[52vh] pr-3 -mr-3">
              <FilterSection title="Grupo de clientes">
                {visibleGroups.map((g) => (
                  <FilterCheck
                    key={g.id}
                    id={`grp-${g.id}`}
                    label={g.name}
                    checked={filterGroups.includes(g.id)}
                    onToggle={() => {
                      setFilterGroups((p) => toggleArr(p, g.id));
                      resetPaging();
                    }}
                  />
                ))}
                <FilterCheck
                  id="grp-none"
                  label="Sem grupo"
                  checked={filterGroups.includes("none")}
                  onToggle={() => {
                    setFilterGroups((p) => toggleArr(p, "none"));
                    resetPaging();
                  }}
                />
              </FilterSection>

              <Separator className="my-3" />

              <FilterSection title="Macro-etapa">
                {trackMacros(track).map((m) => (
                  <FilterCheck
                    key={m.key}
                    id={`macro-${m.key}`}
                    label={`${m.label} (${m.phases[0]}–${m.phases[m.phases.length - 1]})`}
                    color={m.color}
                    checked={filterMacros.includes(m.key)}
                    onToggle={() => {
                      setFilterMacros((p) => toggleArr(p, m.key));
                      resetPaging();
                    }}
                  />
                ))}
              </FilterSection>

              <Separator className="my-3" />

              <FilterSection title="Setor responsável">
                {(Object.keys(OWNERS) as OwnerKey[]).map((o) => (
                  <FilterCheck
                    key={o}
                    id={`own-${o}`}
                    label={`${OWNERS[o]} (${o})`}
                    checked={filterOwners.includes(o)}
                    onToggle={() => {
                      setFilterOwners((p) => toggleArr(p, o));
                      resetPaging();
                    }}
                  />
                ))}
              </FilterSection>

              {allTypes.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <FilterSection title="Tipo de projeto">
                    {allTypes.map((t) => (
                      <FilterCheck
                        key={t}
                        id={`type-${t}`}
                        label={t}
                        checked={filterTypes.includes(t)}
                        onToggle={() => {
                          setFilterTypes((p) => toggleArr(p, t));
                          resetPaging();
                        }}
                      />
                    ))}
                  </FilterSection>
                </>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Chips dos filtros ativos — clicar remove */}
        {period !== "all" && (
          <FilterChip
            label={PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period}
            onRemove={() => {
              setPeriod("all");
              resetPaging();
            }}
          />
        )}
        {clientFilter !== "all" && (
          <FilterChip
            label={clientFilter}
            onRemove={() => {
              setClientFilter("all");
              resetPaging();
            }}
          />
        )}
        {filterGroups.map((id) => (
          <FilterChip
            key={id}
            label={
              id === "none"
                ? "Sem grupo"
                : (visibleGroups.find((g) => g.id === id)?.name ?? id)
            }
            onRemove={() => {
              setFilterGroups((p) => p.filter((x) => x !== id));
              resetPaging();
            }}
          />
        ))}
        {filterMacros.map((k) => (
          <FilterChip
            key={k}
            label={MACRO_LABELS[k]}
            color={MACRO_COLORS[k]}
            onRemove={() => {
              setFilterMacros((p) => p.filter((x) => x !== k));
              resetPaging();
            }}
          />
        ))}
        {filterOwners.map((o) => (
          <FilterChip
            key={o}
            label={OWNERS[o]}
            onRemove={() => {
              setFilterOwners((p) => p.filter((x) => x !== o));
              resetPaging();
            }}
          />
        ))}
        {filterTypes.map((t) => (
          <FilterChip
            key={t}
            label={t}
            onRemove={() => {
              setFilterTypes((p) => p.filter((x) => x !== t));
              resetPaging();
            }}
          />
        ))}
        {activeFilterCount > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-xs text-muted-foreground"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {/* ─── Trilhas: dois pedidos, dois relógios ─── */}
      <Tabs
        value={track}
        onValueChange={(v) => {
          setTrack(v as TrackKey);
          setFilterMacros([]);
          setTab("todos");
          resetPaging();
        }}
      >
        <TabsList className="h-10">
          {TRACK_LIST.map((t) => (
            <TabsTrigger
              key={t.key}
              value={t.key}
              className={cn("gap-2 px-4", projector && "text-base")}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              Pedido de {t.label}
              <span className="text-[11px] text-muted-foreground">
                {t.phases.length} fases
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
              ? `${metrics.bottleneck.phase} ${getPhase(track, metrics.bottleneck.phase)?.short ?? ""}`
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
            a faturar em {metrics.openCount} projeto
            {metrics.openCount !== 1 ? "s" : ""}
            {metrics.billedTotal > 0 && (
              <> · <span className="text-emerald-500">{BRL_FULL.format(metrics.billedTotal)} já faturado</span></>
            )}
            {metrics.finishedCount > 0 && (
              <> · {metrics.finishedCount} já faturado{metrics.finishedCount !== 1 ? "s" : ""}</>
            )}
            {withoutThisTrack > 0 && (
              <span className="text-muted-foreground/70">
                {" "}
                · {withoutThisTrack} projeto{withoutThisTrack !== 1 ? "s" : ""} sem
                pedido de {trackDef.label.toLowerCase()}
              </span>
            )}
          </p>

          {/* ─── Abas ─── */}
          <div className="mt-4">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as TabKey);
                resetPaging();
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
                    <th className="pb-2 pr-3 text-right">A faturar</th>
                    <th className="pb-2 pr-3">Fases 1–10</th>
                    <th className="pb-2 pr-3">Fase atual</th>
                    <th className="pb-2 pr-3">Dono</th>
                    <th className="pb-2 pr-3 text-right">Parado</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => {
                    const def = getPhase(track, row.currentPhase);
                    const macroColor = def ? MACRO_COLORS[def.macro] : undefined;

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
                          {!row.hasValue ? (
                            "—"
                          ) : row.billed ? (
                            // trilha já virou nota: o dinheiro entrou, não está em risco
                            <span className="text-emerald-500">
                              {BRL_COMPACT(row.value)}
                              <span className="block text-[11px] font-normal">
                                faturado
                              </span>
                            </span>
                          ) : (
                            BRL_COMPACT(row.pendingValue)
                          )}
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

              {/* ─── Paginação ─── */}
              <div className="flex items-center justify-between gap-3 flex-wrap mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Mostrando{" "}
                  <span className="font-medium text-foreground">
                    {startIndex + 1}–{startIndex + visible.length}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-foreground">
                    {filtered.length}
                  </span>{" "}
                  projeto{filtered.length !== 1 ? "s" : ""}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[124px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} por página
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setPage(currentPage - 1)}
                        className="h-8 px-2"
                        aria-label="Página anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>

                      {pageNumbers(currentPage, totalPages).map((p, i) =>
                        p === "…" ? (
                          <span
                            key={`gap-${i}`}
                            className="px-1 text-xs text-muted-foreground select-none"
                          >
                            …
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(p)}
                            className="h-8 w-8 p-0 text-xs tabular-nums"
                            aria-label={`Página ${p}`}
                            aria-current={p === currentPage ? "page" : undefined}
                          >
                            {p}
                          </Button>
                        ),
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setPage(currentPage + 1)}
                        className="h-8 px-2"
                        aria-label="Próxima página"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── Legenda fixa: é o que torna os numerais compreensíveis ─── */}
          <div className="border-t border-border mt-4 pt-3 space-y-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {TRACKS[track].phases.map((p) => (
                <span
                  key={p.n}
                  className="text-[11px] text-muted-foreground whitespace-nowrap"
                >
                  <span
                    className="font-mono font-bold"
                    style={{ color: MACRO_COLORS[p.macro] }}
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
