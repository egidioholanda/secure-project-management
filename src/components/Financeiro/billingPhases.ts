import type { Project } from "@/types/project";
import type { ProjectPhaseRecord } from "@/hooks/useProjectPhases";

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
// banda de luminosidade, piso de croma, separação CVD (deutan/protan/tritan),
// piso de visão normal e contraste com a superfície — todos PASS.

export type MacroKey = "pedido" | "material" | "obra" | "faturamento";

export const MACROS: {
  key: MacroKey;
  label: string;
  phases: number[];
  color: string;
}[] = [
  { key: "pedido",      label: "Pedido",      phases: [1, 2],     color: "#3b82f6" },
  { key: "material",    label: "Material",    phases: [3, 4, 5],  color: "#d97706" },
  { key: "obra",        label: "Obra",        phases: [6, 7],     color: "#8b5cf6" },
  { key: "faturamento", label: "Faturamento", phases: [8, 9, 10], color: "#059669" },
];

// ── As 10 fases ──────────────────────────────────────────────────────────────
// Os rótulos descrevem um ESTADO ALCANÇADO, não uma ação — é o que permite ler a
// linha como "onde o projeto está", e não "o que aconteceu".

export interface PhaseDef {
  n: number;
  label: string;      // rótulo da legenda
  short: string;      // rótulo curto, para espaços apertados
  description: string;
  owner: OwnerKey;
  macro: MacroKey;
  slaDays: number;
  noteLabel?: string; // quando a fase carrega um dado (nº de conformidade, NF)
}

export const PHASES: PhaseDef[] = [
  { n: 1,  label: "Pedido recebido",     short: "Pedido",    owner: "COM", macro: "pedido",      slaDays: 2,
    description: "Pedido do cliente recebido" },
  { n: 2,  label: "Pedido fechado",      short: "Fechado",   owner: "COM", macro: "pedido",      slaDays: 3,
    description: "Pedido fechado dentro do nosso sistema" },
  { n: 3,  label: "Compra emitida",      short: "Comprado",  owner: "CMP", macro: "material",    slaDays: 15,
    description: "Material comprado junto ao fornecedor" },
  { n: 4,  label: "Material em estoque", short: "Estoque",   owner: "EST", macro: "material",    slaDays: 2,
    description: "Material chegou no estoque" },
  { n: 5,  label: "Material entregue",   short: "Entregue",  owner: "EST", macro: "material",    slaDays: 3,
    description: "Material faturado e entregue à equipe de instalação" },
  { n: 6,  label: "Obra em execução",    short: "Obra",      owner: "OBR", macro: "obra",        slaDays: 30,
    description: "Obra em andamento no cliente" },
  { n: 7,  label: "Termo de aceite",     short: "Aceite",    owner: "CLI", macro: "obra",        slaDays: 7,
    description: "Obra finalizada e termo de aceite assinado pelo cliente" },
  { n: 8,  label: "Aval do gestor",      short: "Aval OK",   owner: "GES", macro: "faturamento", slaDays: 3,
    description: "Gestor notificou que está tudo OK" },
  { n: 9,  label: "Nº de conformidade",  short: "Conform.",  owner: "CLI", macro: "faturamento", slaDays: 10,
    description: "Setor de compras do cliente enviou o número de conformidade",
    noteLabel: "Número de conformidade" },
  { n: 10, label: "NF no portal",        short: "NF",        owner: "ADM", macro: "faturamento", slaDays: 2,
    description: "Nota fiscal de serviço emitida e anexada no portal do cliente",
    noteLabel: "Número da nota fiscal" },
];

export const TOTAL_PHASES = PHASES.length;
export const DONE_PHASE = TOTAL_PHASES + 1; // fase "virtual" de projeto concluído

export const getPhase = (n: number) => PHASES.find((p) => p.n === n);
export const getMacro = (key: MacroKey) => MACROS.find((m) => m.key === key)!;

// ── Helpers de valor ─────────────────────────────────────────────────────────
// projects.value é TEXT livre ("R$ 480.000,00", "480000", "480 mil"...), então o
// parse é best-effort e projetos sem valor legível são EXCLUÍDOS dos KPIs de R$
// (e contados à parte, para o painel não mentir sobre o total).

// Mesma implementação do parseBRL de DashboardComercial.tsx, de propósito: se os
// dois painéis lessem o mesmo campo de formas diferentes, mostrariam totais
// divergentes para o mesmo projeto.
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

// ── Derivação do estado de um projeto ────────────────────────────────────────

export interface PipelineRow {
  project: Project;
  value: number;
  hasValue: boolean;
  donePhases: number[];
  /** 1..10, ou DONE_PHASE (11) quando as 10 estão concluídas */
  currentPhase: number;
  isFinished: boolean;
  /** true quando nenhuma fase foi marcada ainda */
  notStarted: boolean;
  owner: OwnerKey | null;
  dependsOnClient: boolean;
  /** dias na fase atual; null quando não há data-base confiável */
  daysInPhase: number | null;
  isLate: boolean;
  isVeryLate: boolean;
  /** dias entre a fase 1 e a fase 10, quando ambas concluídas */
  leadTimeDays: number | null;
  lastRecord: ProjectPhaseRecord | null;
  /** valor × dias parados — usado como índice de urgência financeira */
  urgency: number;
}

const DAY_MS = 86_400_000;

const parseDisplayDate = (s: string | undefined): Date | null => {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function buildPipelineRow(
  project: Project,
  records: ProjectPhaseRecord[],
  today: Date = new Date(),
): PipelineRow {
  const byPhase = new Map(records.map((r) => [r.phase, r]));
  const donePhases = records.map((r) => r.phase).sort((a, b) => a - b);

  let currentPhase = DONE_PHASE;
  for (let p = 1; p <= TOTAL_PHASES; p++) {
    if (!byPhase.has(p)) {
      currentPhase = p;
      break;
    }
  }

  const isFinished = currentPhase === DONE_PHASE;
  const notStarted = donePhases.length === 0;
  const def = isFinished ? null : getPhase(currentPhase)!;

  // Base para "dias parado": a última fase concluída, ou o início do projeto
  const lastDone = donePhases.length
    ? records.reduce<ProjectPhaseRecord | null>(
        (acc, r) =>
          !acc || new Date(r.completed_at) > new Date(acc.completed_at) ? r : acc,
        null,
      )
    : null;

  const base = lastDone
    ? new Date(lastDone.completed_at)
    : parseDisplayDate(project.startDate);

  const daysInPhase =
    isFinished || !base
      ? null
      : Math.max(0, Math.floor((today.getTime() - base.getTime()) / DAY_MS));

  const sla = def?.slaDays ?? 0;
  const isLate = daysInPhase !== null && sla > 0 && daysInPhase > sla;
  const isVeryLate = daysInPhase !== null && sla > 0 && daysInPhase > sla * 2;

  const first = byPhase.get(1);
  const last = byPhase.get(TOTAL_PHASES);
  const leadTimeDays =
    first && last
      ? Math.max(
          0,
          Math.round(
            (new Date(last.completed_at).getTime() -
              new Date(first.completed_at).getTime()) /
              DAY_MS,
          ),
        )
      : null;

  const value = parseBRL(project.value);

  return {
    project,
    value,
    hasValue: value > 0,
    donePhases,
    currentPhase,
    isFinished,
    notStarted,
    owner: def?.owner ?? null,
    dependsOnClient: def?.owner === "CLI",
    daysInPhase,
    isLate,
    isVeryLate,
    leadTimeDays,
    lastRecord: lastDone,
    urgency: value * (daysInPhase ?? 0),
  };
}

export function buildPipelineRows(
  projects: Project[],
  allRecords: ProjectPhaseRecord[],
  today: Date = new Date(),
): PipelineRow[] {
  const byProject = new Map<string, ProjectPhaseRecord[]>();
  for (const r of allRecords) {
    const list = byProject.get(r.project_id);
    if (list) list.push(r);
    else byProject.set(r.project_id, [r]);
  }
  return projects.map((p) =>
    buildPipelineRow(p, byProject.get(p.id) ?? [], today),
  );
}
