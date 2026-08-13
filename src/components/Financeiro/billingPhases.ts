import type { Project } from "@/types/project";
import type { ProjectPhaseRecord } from "@/hooks/useProjectPhases";

/**
 * Todo projeto tem DOIS pedidos — produto e serviço — enviados em momentos
 * diferentes e faturados separadamente. Cada um corre na sua trilha, com o
 * próprio pedido, o próprio atraso e a própria nota fiscal.
 *
 * Numa fila única, um projeto com o material entregue e a obra nem começada
 * aparecia como "fase 6" — escondendo que o pedido de serviço nem tinha saído.
 */

export type TrackKey = "produto" | "servico";

// ── Donos de cada fase ───────────────────────────────────────────────────────
// Tag curta em TEXTO (não em cor): a cor já está toda gasta nas macro-etapas, e
// 7 categorias de cor seriam ilegíveis no projetor e péssimas para daltônicos.

export type OwnerKey = "COM" | "CMP" | "EST" | "OBR" | "GES" | "CLI" | "ADM";

export const OWNERS: Record<OwnerKey, string> = {
  COM: "Comercial",
  CMP: "Compras",
  EST: "Estoque",
  OBR: "Instalação",
  GES: "Gestor",
  CLI: "Cliente",
  ADM: "Administrativo",
};

// ── Macro-etapas ─────────────────────────────────────────────────────────────
// Paleta validada com scripts/validate_palette.js (6 checks, modo dark):
// banda de luminosidade, piso de croma, separação CVD e contraste — todos PASS.

export type MacroKey = "pedido" | "material" | "obra" | "faturamento";

export const MACRO_COLORS: Record<MacroKey, string> = {
  pedido: "#3b82f6",
  material: "#d97706",
  obra: "#8b5cf6",
  faturamento: "#059669",
};

export const MACRO_LABELS: Record<MacroKey, string> = {
  pedido: "Pedido",
  material: "Material",
  obra: "Obra",
  faturamento: "Faturamento",
};

export interface PhaseDef {
  n: number;
  label: string;
  short: string;
  description: string;
  owner: OwnerKey;
  macro: MacroKey;
  slaDays: number;
  noteLabel?: string;
  /**
   * Fase que pode acontecer fora da ordem. Marcá-la NÃO conclui as anteriores
   * — mas ela é concluída junto quando uma fase posterior é marcada.
   */
  outOfOrder?: boolean;
}

export interface TrackDef {
  key: TrackKey;
  label: string;
  /** o que está sendo vendido nesta trilha */
  what: string;
  color: string;
  phases: PhaseDef[];
  /** fase em que esta trilha vira nota fiscal */
  billingPhase: number;
  macros: MacroKey[];
}

// ── Trilha PRODUTO ───────────────────────────────────────────────────────────

const PRODUCT_PHASES: PhaseDef[] = [
  { n: 1, label: "Pedido recebido", short: "Pedido", owner: "COM", macro: "pedido", slaDays: 2,
    description: "Pedido de produto recebido do cliente" },
  { n: 2, label: "Pedido fechado", short: "Fechado", owner: "COM", macro: "pedido", slaDays: 3,
    description: "Pedido de produto fechado dentro do nosso sistema" },
  { n: 3, label: "Compra emitida", short: "Comprado", owner: "CMP", macro: "material", slaDays: 15,
    description: "Material comprado junto ao fornecedor" },
  { n: 4, label: "Material em estoque", short: "Estoque", owner: "EST", macro: "material", slaDays: 2,
    description: "Material chegou no estoque" },
  // O faturamento do produto acontece aqui, no ato da entrega à equipe.
  // As fases 6 e 7 são o caminho até o cliente pagar (em até 90 dias a
  // contar deste faturamento), não um segundo faturamento.
  { n: 5, label: "NF faturada e entregue", short: "NF Produto", owner: "EST", macro: "faturamento", slaDays: 3,
    description: "Nota fiscal emitida e material entregue à equipe de instalação",
    noteLabel: "Número da nota fiscal" },
  { n: 6, label: "Nº de conformidade", short: "Conform.", owner: "CLI", macro: "faturamento", slaDays: 10,
    description: "Setor de compras do cliente enviou o número de conformidade",
    noteLabel: "Número de conformidade" },
  { n: 7, label: "NF no portal", short: "No portal", owner: "ADM", macro: "faturamento", slaDays: 2,
    description: "Nota fiscal anexada no portal do cliente — libera o pagamento" },
];

// ── Trilha SERVIÇO ───────────────────────────────────────────────────────────

const SERVICE_PHASES: PhaseDef[] = [
  { n: 1, label: "Pedido recebido", short: "Pedido", owner: "COM", macro: "pedido", slaDays: 2,
    description: "Pedido de serviço recebido do cliente" },
  { n: 2, label: "Pedido fechado", short: "Fechado", owner: "COM", macro: "pedido", slaDays: 3,
    description: "Pedido de serviço fechado dentro do nosso sistema" },
  // Na prática a instalação costuma começar antes de o pedido chegar — não é
  // regra, mas é comum. Marcar a obra não pode inventar um pedido que não
  // existe, então esta fase corre solta.
  { n: 3, label: "Obra em execução", short: "Obra", owner: "OBR", macro: "obra", slaDays: 30,
    description: "Obra em andamento no cliente", outOfOrder: true },
  { n: 4, label: "Termo de aceite", short: "Aceite", owner: "CLI", macro: "obra", slaDays: 7,
    description: "Obra finalizada e termo de aceite assinado pelo cliente" },
  { n: 5, label: "Aval do gestor", short: "Aval OK", owner: "GES", macro: "faturamento", slaDays: 3,
    description: "Gestor notificou que está tudo OK" },
  { n: 6, label: "Nº de conformidade", short: "Conform.", owner: "CLI", macro: "faturamento", slaDays: 10,
    description: "Setor de compras do cliente enviou o número de conformidade",
    noteLabel: "Número de conformidade" },
  { n: 7, label: "NF faturada", short: "NF emitida", owner: "ADM", macro: "faturamento", slaDays: 2,
    description: "Nota fiscal de serviço emitida",
    noteLabel: "Número da nota fiscal" },
  { n: 8, label: "NF no portal", short: "No portal", owner: "ADM", macro: "faturamento", slaDays: 2,
    description: "Nota fiscal anexada no portal do cliente" },
];

export const TRACKS: Record<TrackKey, TrackDef> = {
  produto: {
    key: "produto",
    label: "Produto",
    what: "equipamentos",
    color: "#8b5cf6",
    phases: PRODUCT_PHASES,
    // fatura na entrega à equipe (5). Conformidade e portal vêm depois e são
    // condição para o cliente pagar, mas a nota já saiu.
    billingPhase: 5,
    macros: ["pedido", "material", "faturamento"],
  },
  servico: {
    key: "servico",
    label: "Serviço",
    what: "instalação",
    color: "#3b82f6",
    phases: SERVICE_PHASES,
    // fatura na emissão da nota (7); anexar no portal (8) é o encerramento,
    // e um projeto parado ali já teve o dinheiro reconhecido
    billingPhase: 7,
    macros: ["pedido", "obra", "faturamento"],
  },
};

export const TRACK_LIST: TrackDef[] = [TRACKS.produto, TRACKS.servico];

export const getTrack = (k: TrackKey) => TRACKS[k];
export const getPhase = (track: TrackKey, n: number) =>
  TRACKS[track].phases.find((p) => p.n === n);

/**
 * Quais fases gravar ao concluir `target`.
 *
 * O checklist é sequencial, então marcar a fase 5 conclui as anteriores que
 * ficaram em branco — não faz sentido ter buraco no meio da trilha. A exceção
 * são as fases `outOfOrder`: marcá-las registra só elas, porque acontecerem
 * antes é justamente o ponto.
 */
export function phasesToComplete(
  track: TrackKey,
  target: number,
  done: number[],
): number[] {
  const def = TRACKS[track];
  const t = def.phases.find((p) => p.n === target);
  if (!t || done.includes(target)) return [];
  if (t.outOfOrder) return [target];
  return def.phases
    .filter((p) => p.n <= target && !done.includes(p.n))
    .map((p) => p.n);
}

/**
 * Quais fases remover ao reabrir `target`.
 *
 * As posteriores caem junto (sem obra não há aceite), mas uma fase
 * `outOfOrder` sobrevive: ela não dependia desta para ter acontecido.
 */
export function phasesToReopen(
  track: TrackKey,
  target: number,
  done: number[],
): number[] {
  const def = TRACKS[track];
  return done.filter((n) => {
    if (n < target) return false;
    if (n === target) return true;
    return !def.phases.find((p) => p.n === n)?.outOfOrder;
  });
}

/** macro-etapas de uma trilha, com as fases que caem em cada uma */
export const trackMacros = (track: TrackKey) =>
  TRACKS[track].macros.map((key) => ({
    key,
    label: MACRO_LABELS[key],
    color: MACRO_COLORS[key],
    phases: TRACKS[track].phases.filter((p) => p.macro === key).map((p) => p.n),
  }));

// ── Helpers de valor ─────────────────────────────────────────────────────────

export function parseBRL(value: string | null | undefined): number {
  if (!value) return 0;
  const n = parseFloat(
    value.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return isNaN(n) ? 0 : n;
}

export const BRL_COMPACT = (v: number): string => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)} mil`;
  return `R$ ${v.toFixed(0)}`;
};

export const BRL_FULL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Valor de cada trilha. Projetos anteriores ao split não têm produto/serviço
 * separados: o total legado é tratado como produto, para o dinheiro não sumir.
 */
export function trackValue(project: Project, track: TrackKey): number {
  const hasSplit =
    (project.productValue ?? null) !== null || (project.serviceValue ?? null) !== null;
  if (!hasSplit) return track === "produto" ? parseBRL(project.value) : 0;
  return (track === "produto" ? project.productValue : project.serviceValue) ?? 0;
}

// ── Derivação do estado de uma trilha ────────────────────────────────────────

export interface TrackRow {
  project: Project;
  track: TrackKey;
  value: number;
  hasValue: boolean;
  /** esta trilha já virou nota fiscal */
  billed: boolean;
  /** o que ainda não foi faturado nesta trilha — o dinheiro em risco */
  pendingValue: number;
  donePhases: number[];
  /** 1..N, ou totalPhases+1 quando a trilha terminou */
  currentPhase: number;
  isFinished: boolean;
  notStarted: boolean;
  owner: OwnerKey | null;
  dependsOnClient: boolean;
  daysInPhase: number | null;
  isLate: boolean;
  isVeryLate: boolean;
  /** dias entre o pedido e a nota fiscal desta trilha */
  leadTimeDays: number | null;
  lastRecord: ProjectPhaseRecord | null;
  urgency: number;
  enteredAt: Date | null;
}

const DAY_MS = 86_400_000;

export function buildTrackRow(
  project: Project,
  records: ProjectPhaseRecord[],
  track: TrackKey,
  today: Date = new Date(),
): TrackRow {
  const def = TRACKS[track];
  const total = def.phases.length;
  const mine = records.filter((r) => r.track === track);
  const byPhase = new Map(mine.map((r) => [r.phase, r]));
  const donePhases = mine.map((r) => r.phase).sort((a, b) => a - b);

  let currentPhase = total + 1;
  for (let p = 1; p <= total; p++) {
    if (!byPhase.has(p)) {
      currentPhase = p;
      break;
    }
  }

  const isFinished = currentPhase > total;
  const notStarted = donePhases.length === 0;
  const phaseDef = isFinished ? null : getPhase(track, currentPhase)!;

  const lastDone = donePhases.length
    ? mine.reduce<ProjectPhaseRecord | null>(
        (acc, r) =>
          !acc || new Date(r.completed_at) > new Date(acc.completed_at) ? r : acc,
        null,
      )
    : null;

  // Sem marcação não há medição: usar a data de início do projeto faria todo
  // projeto legado nascer "atrasado há centenas de dias".
  const daysInPhase =
    isFinished || !lastDone
      ? null
      : Math.max(
          0,
          Math.floor(
            (today.getTime() - new Date(lastDone.completed_at).getTime()) / DAY_MS,
          ),
        );

  const sla = phaseDef?.slaDays ?? 0;
  const isLate = daysInPhase !== null && sla > 0 && daysInPhase > sla;
  const isVeryLate = daysInPhase !== null && sla > 0 && daysInPhase > sla * 2;

  const first = byPhase.get(1);
  const billing = byPhase.get(def.billingPhase);
  const leadTimeDays =
    first && billing
      ? Math.max(
          0,
          Math.round(
            (new Date(billing.completed_at).getTime() -
              new Date(first.completed_at).getTime()) /
              DAY_MS,
          ),
        )
      : null;

  const value = trackValue(project, track);
  const billed = byPhase.has(def.billingPhase);
  const pendingValue = billed ? 0 : value;

  const enteredAt = first
    ? new Date(first.completed_at)
    : project.createdAt
      ? new Date(project.createdAt)
      : null;

  return {
    project,
    track,
    value,
    hasValue: value > 0,
    billed,
    pendingValue,
    donePhases,
    currentPhase,
    isFinished,
    notStarted,
    owner: phaseDef?.owner ?? null,
    dependsOnClient: phaseDef?.owner === "CLI",
    daysInPhase,
    isLate,
    isVeryLate,
    leadTimeDays,
    lastRecord: lastDone,
    // urgência é sobre o dinheiro ainda não faturado desta trilha
    urgency: pendingValue * (daysInPhase ?? 0),
    enteredAt,
  };
}

export function buildTrackRows(
  projects: Project[],
  allRecords: ProjectPhaseRecord[],
  track: TrackKey,
  today: Date = new Date(),
): TrackRow[] {
  const byProject = new Map<string, ProjectPhaseRecord[]>();
  for (const r of allRecords) {
    const list = byProject.get(r.project_id);
    if (list) list.push(r);
    else byProject.set(r.project_id, [r]);
  }
  return projects.map((p) =>
    buildTrackRow(p, byProject.get(p.id) ?? [], track, today),
  );
}

// ── Filtros ──────────────────────────────────────────────────────────────────

export const PERIOD_OPTIONS = [
  { value: "all", label: "Todos os períodos" },
  { value: "month", label: "Este mês" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "6months", label: "Últimos 6 meses" },
  { value: "year", label: "Este ano" },
];

export const getDateThreshold = (period: string): Date | null => {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (period === "6months") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
};

/** `projects.type` guarda vários tipos separados por vírgula ("CFTV,Alarme") */
export const projectTypes = (raw: string | undefined): string[] =>
  (raw ?? "").split(",").map((t) => t.trim()).filter(Boolean);

export const toggleArr = <T,>(arr: T[], val: T): T[] =>
  arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
